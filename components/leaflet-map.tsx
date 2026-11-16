"use client";
// Real map: Leaflet + Carto Positron tiles (OpenStreetMap data). Clustered custom markers,
// ward boundaries, auto-fit to whatever is shown. Loaded client-only via components/city-map.tsx.
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useEffect, useRef } from "react";
import { BOUNDS, openRepairFor } from "@/lib/portal";
import type { Light, State } from "@/lib/types";
import { shownStatus } from "@/lib/view";
import type { MapProps } from "./city-map";
import { LightCard } from "./light-card";
import { cx } from "./ui";

// Carto Voyager raster tiles. Key comes from NEXT_PUBLIC_CARTO_KEY (.env.local); keyless fallback for local dev.
const KEY = process.env.NEXT_PUBLIC_CARTO_KEY;
const TILES = KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${KEY}`
  : "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

type Kind = "working" | "pending" | "damaged" | "awaiting";
const kindOf = (s: State, l: Light): Kind => {
  const k = shownStatus(s, l).key;
  return k === "pending" ? "pending" : k === "awaiting" ? "awaiting" : k === "damaged" ? "damaged" : "working";
};

const pinIcon = (kind: Kind, selected: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="slp-pin slp-pin--${kind}${selected ? " is-selected" : ""}">${kind === "damaged" ? "!" : ""}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

// Leaflet schedules a bound zoom-transition callback (setTimeout 250ms). If the map is removed
// mid-zoom (user navigates away), it runs on a dead map and throws. Skip it when the pane is gone.
const proto = L.Map.prototype as unknown as { _onZoomTransitionEnd: (this: { _mapPane?: unknown }) => void };
const onZoomEnd = proto._onZoomTransitionEnd;
proto._onZoomTransitionEnd = function () {
  if (this._mapPane) onZoomEnd.call(this);
};

const focusIcon = L.divIcon({ className: "", html: '<span class="slp-focus"></span>', iconSize: [30, 30], iconAnchor: [15, 15] });

const wardBounds = (w: number): L.LatLngBoundsLiteral => {
  const r = Math.floor((w - 1) / 3), c = (w - 1) % 3;
  const dLat = (BOUNDS.north - BOUNDS.south) / 3, dLng = (BOUNDS.east - BOUNDS.west) / 3;
  return [
    [BOUNDS.north - dLat * (r + 1), BOUNDS.west + dLng * c],
    [BOUNDS.north - dLat * r, BOUNDS.west + dLng * (c + 1)],
  ];
};
const CITY: L.LatLngBoundsExpression = [
  [BOUNDS.south, BOUNDS.west],
  [BOUNDS.north, BOUNDS.east],
];

export default function LeafletMap({ data, lights, ward, selected, onSelect, onWard, className, popover = true, wardLabels = true, focus, zoomFocus }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const cb = useRef({ onSelect, onWard });
  useEffect(() => {
    cb.current = { onSelect, onWard };
  });
  const mini = !!zoomFocus;

  // create once
  useEffect(() => {
    const m = L.map(el.current!, {
      zoomControl: !mini,
      attributionControl: true,
      dragging: !mini,
      scrollWheelZoom: !mini,
      doubleClickZoom: !mini,
      touchZoom: !mini,
      keyboard: !mini,
      boxZoom: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    });
    m.attributionControl.setPrefix(false);
    if (!mini) m.zoomControl.setPosition("topright");
    L.tileLayer(TILES, {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m);
    overlay.current = L.layerGroup().addTo(m);
    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 64,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (c) => {
        const kids = c.getAllChildMarkers() as (L.Marker & { options: { kind?: Kind } })[];
        const bad = kids.filter((k) => k.options.kind === "damaged" || k.options.kind === "awaiting").length;
        const n = c.getChildCount();
        const size = n < 20 ? 38 : n < 100 ? 46 : 54;
        return L.divIcon({
          className: "",
          html: `<span class="slp-cluster" style="width:${size}px;height:${size}px">${n}${bad ? `<b>${bad}</b>` : ""}</span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    m.addLayer(cluster.current);
    m.on("click", () => cb.current.onSelect?.(null));
    m.fitBounds(CITY);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      m.stop();
      m.off();
      cluster.current?.clearLayers();
      m.remove();
      map.current = null;
      cluster.current = null;
    };
  }, [mini]);

  // ward boundaries + labels (tap a label to zoom into that ward)
  useEffect(() => {
    const g = overlay.current;
    if (!g) return;
    g.clearLayers();
    if (!wardLabels || mini) return;
    for (let w = 1; w <= 9; w++) {
      const b = L.latLngBounds(wardBounds(w));
      const active = ward === w;
      L.rectangle(b, {
        color: active ? "#111a2e" : "#64748b",
        weight: active ? 2 : 1,
        dashArray: active ? undefined : "5 5",
        fillColor: "#111a2e",
        fillOpacity: active ? 0.03 : 0,
        interactive: false,
      }).addTo(g);
      const lbl = L.marker(b.getNorthWest(), {
        icon: L.divIcon({ className: "", html: `<span class="slp-ward${active ? " is-active" : ""}">Ward ${w}</span>`, iconSize: [0, 0], iconAnchor: [-8, -8] }),
        keyboard: false,
        zIndexOffset: 5000,
      }).addTo(g);
      lbl.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        cb.current.onWard?.(w);
      });
    }
  }, [ward, wardLabels, mini]);

  // markers
  useEffect(() => {
    const c = cluster.current;
    if (!c) return;
    c.clearLayers();
    markers.current.clear();
    const list = lights
      .filter((l) => l.status !== "returned")
      .map((l) => {
        const kind = kindOf(data, l);
        const mk = L.marker([l.lat, l.lng], { icon: pinIcon(kind, false), kind, title: l.sno, riseOnHover: true } as L.MarkerOptions);
        mk.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          cb.current.onSelect?.(l);
        });
        markers.current.set(l.id, mk);
        return mk;
      });
    c.addLayers(list);
  }, [lights, data]);

  // fit to what is shown
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (focus && mini) {
      m.setView([focus.lat, focus.lng], 18, { animate: false });
      return;
    }
    if (ward) return void m.fitBounds(wardBounds(ward), { padding: [16, 16] });
    const live = lights.filter((l) => l.status !== "returned");
    if (live.length && live.length < 200) m.fitBounds(L.latLngBounds(live.map((l) => [l.lat, l.lng] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 17 });
    else m.fitBounds(CITY, { padding: [8, 8] });
  }, [ward, lights, focus, mini]);

  // focus marker (approval card, add-light fix, report location)
  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    const mk = L.marker([focus.lat, focus.lng], { icon: focusIcon, interactive: false, zIndexOffset: 1000 }).addTo(m);
    return () => {
      if (map.current) mk.remove(); // map may already be gone on unmount
    };
  }, [focus]);

  // selection highlight
  useEffect(() => {
    if (!selected) return;
    const mk = markers.current.get(selected);
    const l = lights.find((x) => x.id === selected);
    if (!mk || !l) return;
    mk.setIcon(pinIcon(kindOf(data, l), true));
    mk.setZIndexOffset(1000);
    // if the pin is hidden inside a cluster, zoom to where clustering switches off (17)
    const m = map.current;
    if (!mini && m && cluster.current?.getVisibleParent(mk) !== mk) m.setView(mk.getLatLng(), Math.max(m.getZoom(), 17));
    return () => {
      if (!map.current) return;
      mk.setIcon(pinIcon(kindOf(data, l), false));
      mk.setZIndexOffset(0);
    };
  }, [selected, lights, data, mini]);

  const sel = popover ? lights.find((l) => l.id === selected) : undefined;
  return (
    <div className={cx("isolate overflow-hidden bg-[#eef1f4]", className ?? "relative")}>
      <div ref={el} className="absolute inset-0" role="region" aria-label={`Map of ${ward ? `ward ${ward}` : "all wards"} with ${lights.length} lights`} />
      {sel && <LightCard data={data} light={sel} repair={openRepairFor(data, sel.id)} onClose={() => onSelect?.(null)} />}
    </div>
  );
}

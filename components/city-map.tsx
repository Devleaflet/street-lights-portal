"use client";
// Real map loader. Leaflet needs `window`, so it is imported client-side only.
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { Light, State } from "@/lib/types";
import { cx } from "./ui";

export interface MapProps {
  data: State;
  lights: Light[];
  ward?: number;
  selected?: string | null;
  onSelect?: (l: Light | null) => void;
  /** tapping a ward label */
  onWard?: (ward: number) => void;
  className?: string;
  popover?: boolean;
  wardLabels?: boolean;
  focus?: { lat: number; lng: number } | null;
  /** small, non-interactive map zoomed onto `focus` */
  zoomFocus?: boolean;
}

const LeafletMap = dynamic<MapProps>(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-[#eef1f4]" aria-label="Loading map" />,
});

/** Sized by the caller's className; the Leaflet map fills it. */
export function CityMap({ className, ...p }: MapProps) {
  return (
    <div className={cx("relative overflow-hidden", className)}>
      <LeafletMap {...p} className="absolute inset-0" />
    </div>
  );
}

export function MapLegend({ className }: { className?: string }) {
  const item = (dot: ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      {dot}
      {label}
    </span>
  );
  return (
    <div className={cx("flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mute", className)}>
      {item(<span className="slp-pin slp-pin--working !size-3.5" />, "Working")}
      {item(<span className="slp-pin slp-pin--pending !size-3.5" />, "Pending")}
      {item(<span className="slp-pin slp-pin--damaged !size-4 !text-[9px]">!</span>, "Damaged")}
      {item(<span className="slp-pin slp-pin--awaiting !size-3.5" />, "Awaiting after-photo")}
      {item(<span className="slp-cluster !size-5 !text-[9px] !border-2">9</span>, "Group of lights")}
    </div>
  );
}

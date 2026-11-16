"use client";
import { Check, LocateFixed } from "lucide-react";
import type { ReactNode } from "react";
import { gpsQuality } from "@/lib/format";
import { BOUNDS, wardFromGps } from "@/lib/portal";
import type { State } from "@/lib/types";
import { CityMap } from "./city-map";
import { cx } from "./ui";

export interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
  simulated: boolean;
}

export function StepCard({ n, done, active, title, right, children }: { n: number; done: boolean; active: boolean; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className={cx("rounded-2xl bg-white p-4", active ? "border-2 border-brand" : "border border-line")}>
      <div className="mb-3 flex items-center gap-3">
        <span className={cx("grid size-10 shrink-0 place-items-center rounded-full text-lg font-bold", done ? "bg-ok text-white" : active ? "bg-brand text-navy-900" : "bg-pend-soft text-mute")}>
          {done ? <Check size={22} strokeWidth={3} /> : n}
        </span>
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const inside = (lat: number, lng: number) => lat > BOUNDS.south && lat < BOUNDS.north && lng > BOUNDS.west && lng < BOUNDS.east;

/** Real GPS when it lands inside the demo city, otherwise a simulated fix (most testers aren't standing in the city). */
export function captureFix(): Promise<Fix> {
  const simulate = (): Fix => ({
    lat: +(BOUNDS.south + 0.004 + Math.random() * (BOUNDS.north - BOUNDS.south - 0.008)).toFixed(5),
    lng: +(BOUNDS.west + 0.004 + Math.random() * (BOUNDS.east - BOUNDS.west - 0.008)).toFixed(5),
    accuracy: 3 + Math.floor(Math.random() * 6),
    simulated: true,
  });
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(simulate());
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng, accuracy } = p.coords;
        resolve(inside(lat, lng) ? { lat: +lat.toFixed(5), lng: +lng.toFixed(5), accuracy: Math.round(accuracy), simulated: false } : simulate());
      },
      () => resolve(simulate()),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}

export function FixView({ data, fix }: { data: State; fix: Fix }) {
  const q = gpsQuality(fix.accuracy);
  return (
    <div className="flex items-center gap-4">
      <CityMap data={data} lights={[]} ward={wardFromGps(fix.lat, fix.lng)} focus={fix} zoomFocus wardLabels={false} popover={false} className="h-24 w-36 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="tabular text-[17px]">
          {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
        </p>
        <span className={cx("mt-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold", q.tone === "ok" ? "bg-ok-soft text-ok" : q.tone === "wait" ? "bg-wait-soft text-wait-ink" : "bg-bad-soft text-bad-ink")}>
          <LocateFixed size={18} /> ±{fix.accuracy} m · {q.label}
        </span>
        {fix.simulated && <p className="mt-1 text-xs text-mute">Demo fix: you are outside the demo city, so a point inside it was used.</p>}
      </div>
    </div>
  );
}

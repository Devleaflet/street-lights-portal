"use client";
import { Maximize2 } from "lucide-react";
import { useRef, useState } from "react";
import { clock, date, day, gpsQuality } from "@/lib/format";
import { nearestLight } from "@/lib/portal";
import type { Light, State } from "@/lib/types";
import { CityMap } from "./city-map";
import { Alert, PhotoBox, Pill, Sheet, cx } from "./ui";

/** One pending light, swipeable: right = approve, left = skip. */
export function ApproveCard({ data, light, onApprove, onSkip }: { data: State; light: Light; onApprove: () => void; onSkip: () => void }) {
  const [dx, setDx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const owner = data.users.find((u) => u.id === light.ownerId)?.name ?? "—";
  const q = gpsQuality(light.accuracy);
  const near = nearestLight(data, light.lat, light.lng, 15, light.id);

  const end = () => {
    if (dx > 110) onApprove();
    else if (dx < -110) onSkip();
    start.current = null;
    setDragging(false);
    setDx(0);
  };

  return (
    <>
      <article
        className={cx("touch-pan-y overflow-hidden rounded-3xl border border-line bg-white select-none lg:grid lg:grid-cols-2", !dragging && "transition-transform duration-200")}
        style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          if (!start.current || start.current.id !== e.pointerId) return;
          const x = e.clientX - start.current.x;
          if (Math.abs(x) > 8 && Math.abs(x) > Math.abs(e.clientY - start.current.y)) {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setDragging(true);
            setDx(x);
          }
        }}
        onPointerUp={end}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        <div className="relative">
          <PhotoBox src={light.photo} alt={`Installer's photo of ${light.sno}`} label={light.photo ? undefined : "Installer's photo of the light"} className="aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-[420px]" icon={40} />
          <span className="absolute bottom-3 left-3 rounded-lg bg-navy-700/90 px-2.5 py-1 text-sm font-semibold text-white">
            Taken {day(light.installedAt)}, {clock(light.installedAt)}
          </span>
          <button type="button" onClick={() => setZoom(true)} aria-label="View photo full size" className="absolute right-3 bottom-3 grid size-12 place-items-center rounded-xl bg-navy-700/90 text-white">
            <Maximize2 size={20} />
          </button>
          {dx !== 0 && (
            <span className={cx("absolute top-4 rounded-xl px-3 py-1.5 text-lg font-bold text-white", dx > 0 ? "left-4 bg-ok" : "right-4 bg-pend")} style={{ opacity: Math.min(1, Math.abs(dx) / 110) }}>
              {dx > 0 ? "Approve" : "Skip"}
            </span>
          )}
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[28px] font-bold">{light.sno}</h2>
            <Pill tone="pend" className="px-3 py-1 text-sm">
              Pending
            </Pill>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Info label="Ward" value={light.ward} />
            <Info label="Installer" value={owner} />
            <Info label="Installed" value={date(light.installedAt)} />
            <Info label="GPS accuracy" value={<span className={q.tone === "ok" ? "text-ok" : q.tone === "wait" ? "text-wait-ink" : "text-bad-ink"}>±{light.accuracy} m · {q.label}</span>} />
          </dl>
          <div className="relative overflow-hidden rounded-2xl">
            <CityMap data={data} lights={data.lights.filter((l) => l.ward === light.ward && l.id !== light.id && l.status !== "pending")} ward={light.ward} focus={light} zoomFocus wardLabels={false} popover={false} className="h-36" />
            <span className="tabular absolute right-2 bottom-2 rounded-lg bg-white px-2 py-1 text-sm font-medium">
              {light.lat.toFixed(4)}, {light.lng.toFixed(4)}
            </span>
          </div>
          {near && (
            <Alert>
              Another light, <b>{near.light.sno}</b>, is {near.metres} m away. Check this isn&apos;t a duplicate.
            </Alert>
          )}
          {q.tone === "bad" && <Alert tone="bad">GPS is only ±{light.accuracy} m. Check the location before approving, or send it back.</Alert>}
        </div>
      </article>
      <Sheet open={zoom} onClose={() => setZoom(false)} title={light.sno}>
        <PhotoBox src={light.photo} alt={`Installer's photo of ${light.sno}`} label={light.photo ? undefined : "No photo for this seeded light"} className="aspect-[4/3] w-full rounded-2xl" icon={48} />
      </Sheet>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[15px] text-mute">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

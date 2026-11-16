"use client";
import { History, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { day } from "@/lib/format";
import type { Light, Repair, State } from "@/lib/types";
import { shownStatus } from "@/lib/view";
import { PhotoBox, Pill } from "./ui";

/** Docked card for a tapped marker — bottom of the map on phones, bottom-left card on desktop. */
export function LightCard({ data, light, repair, onClose }: { data: State; light: Light; repair?: Repair; onClose: () => void }) {
  const st = shownStatus(data, light);
  const owner = data.users.find((u) => u.id === light.ownerId)?.name ?? "—";
  return (
    <div className="absolute inset-x-3 bottom-3 z-[1100] rounded-2xl border border-line bg-white p-3 shadow-[0_16px_40px_-16px_rgba(17,26,46,0.45)] sm:right-auto sm:w-80" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <PhotoBox src={light.photo} alt={`Photo of ${light.sno}`} className="size-14 shrink-0 rounded-xl" icon={20} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="font-display text-lg font-bold">{light.sno}</p>
            <Pill tone={st.tone}>{st.label}</Pill>
          </div>
          <p className="truncate text-sm text-mute">
            Ward {light.ward} · {owner}
            {light.place ? ` · ${light.place}` : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-mute hover:bg-canvas hover:text-ink">
          <X size={18} />
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-canvas p-2.5 text-center">
        <Fact label="Installed" value={day(light.installedAt)} />
        <Fact label="Repairs" value={light.repairCount} />
        <Fact label="GPS" value={`±${light.accuracy} m`} />
      </dl>
      {repair && <p className="mt-2 truncate text-sm font-medium text-bad-ink">Reported: &ldquo;{repair.complaint}&rdquo;</p>}
      <Link href={`/light?sno=${light.sno}`} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-navy-900 text-sm font-semibold text-white hover:bg-navy-800">
        <History size={16} /> Open history
      </Link>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-mute uppercase">{label}</dt>
      <dd className="tabular text-sm font-semibold">{value}</dd>
    </div>
  );
}

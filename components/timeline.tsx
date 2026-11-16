"use client";
import { useState } from "react";
import { day, daysBetween, month, when } from "@/lib/format";
import type { Light, Repair, State } from "@/lib/types";
import { STAGES } from "@/lib/view";
import { PhotoBox, Sheet, cx } from "./ui";

const range = (a: string, b: string) => {
  const x = new Date(a), y = new Date(b);
  return x.getMonth() === y.getMonth() ? `${x.getDate()} → ${y.getDate()} ${month(b)}` : `${day(a)} → ${day(b)}`;
};

function Item({ dot, meta, title, children }: { dot: string; meta: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="relative pb-6 pl-10 last:pb-0">
      <span className={cx("absolute top-0.5 left-0 size-7 rounded-full border-[5px]", dot)} />
      <p className="text-[15px] text-mute">{meta}</p>
      <p className="text-lg font-semibold">{title}</p>
      {children}
    </li>
  );
}

export function Timeline({ data, light, repairs }: { data: State; light: Light; repairs: Repair[] }) {
  const [photo, setPhoto] = useState<Repair | null>(null);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? "—";
  const reporter = (r: Repair) => (data.users.find((u) => u.id === r.reportedBy)?.role === "admin" ? "Admin" : "Ward officer");
  const done = repairs.filter((r) => r.stage === "repaired").reverse();
  const num = (r: Repair) => done.findIndex((x) => x.id === r.id) + 1;

  return (
    <>
      <ol className="relative before:absolute before:top-3 before:bottom-3 before:left-[13px] before:w-0.5 before:bg-line">
        {repairs.map((r) =>
          r.stage === "repaired" ? (
            <Item key={r.id} dot="border-ok-soft bg-ok" meta={`${range(r.reportedAt, r.repairedAt!)} · Repair #${num(r)}`} title={`"${r.complaint}" · fixed in ${Math.max(1, daysBetween(r.reportedAt, r.repairedAt!))} day${daysBetween(r.reportedAt, r.repairedAt!) > 1 ? "s" : ""}`}>
              <button type="button" onClick={() => setPhoto(r)} className="text-[15px] font-semibold text-link underline">
                View after-photo
              </button>
            </Item>
          ) : (
            <Item key={r.id} dot="border-bad-soft bg-bad" meta={`${when(r.reportedAt)} · ${reporter(r)}`} title={`Reported: "${r.complaint}"`}>
              <p className="text-[15px] text-mute">
                Now: {STAGES.find((s) => s.key === r.stage)!.short}
                {r.stage === "photo" && (
                  <>
                    {" · "}
                    <button type="button" onClick={() => setPhoto(r)} className="font-semibold text-link underline">
                      View after-photo
                    </button>
                  </>
                )}
              </p>
            </Item>
          ),
        )}
        <Item
          dot="border-pend-soft bg-navy-700"
          meta={`${day(light.installedAt)} · ${light.status === "pending" ? "Installed, waiting for approval" : light.status === "returned" ? "Installed, sent back" : "Installed & approved"}`}
          title={`Added by ${name(light.addedBy)}`}
        />
      </ol>
      <Sheet open={!!photo} onClose={() => setPhoto(null)} title={`After-photo · ${light.sno}`}>
        {photo && (
          <>
            <PhotoBox src={photo.afterPhoto} alt={`After-maintenance photo of ${light.sno}`} label={photo.afterPhoto ? undefined : "After-maintenance photo"} className="aspect-[4/3] w-full rounded-2xl" icon={48} />
            <p className="mt-3 text-[15px] text-mute">
              Added {photo.afterPhotoAt ? day(photo.afterPhotoAt) : ""} by {name(photo.afterPhotoBy ?? light.ownerId)}
            </p>
          </>
        )}
      </Sheet>
    </>
  );
}

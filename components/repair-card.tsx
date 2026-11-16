"use client";
import { Bell, Camera, Check, History, ImageIcon } from "lucide-react";
import { useState } from "react";
import { day, daysBetween, ordinal } from "@/lib/format";
import { addAfterPhoto, markRepaired, notifyOwner, remindOwner } from "@/lib/portal";
import { act } from "@/lib/store";
import type { Repair, State } from "@/lib/types";
import { stageIndex } from "@/lib/view";
import { Button, LinkButton, PhotoBox, Pill, Sheet, cx } from "./ui";
import { PhotoInput } from "./widgets";

export function repairBadge(data: State, r: Repair): { text: string; tone: "bad" | "pend" | "ok" } {
  if (r.stage === "repaired") return { text: `Repaired ${day(r.repairedAt!)}`, tone: "ok" };
  const before = data.repairs.filter((x) => x.lightId === r.lightId && x.stage === "repaired" && x.reportedAt < r.reportedAt).length;
  if (before >= 2) return { text: `Repeat · ${ordinal(before + 1)} time`, tone: "bad" };
  const d = daysBetween(r.reportedAt);
  return { text: d < 1 ? "Open today" : `Open ${d} day${d > 1 ? "s" : ""}`, tone: d >= 2 ? "bad" : "pend" };
}

export function RepairCard({ data, r, open, onToggle, canAct }: { data: State; r: Repair; open: boolean; onToggle: () => void; canAct: boolean }) {
  const [view, setView] = useState(false);
  const light = data.lights.find((l) => l.id === r.lightId)!;
  const owner = data.users.find((u) => u.id === light.ownerId)?.name ?? "—";
  const before = data.repairs.filter((x) => x.lightId === r.lightId && x.stage === "repaired" && x.id !== r.id && x.reportedAt < r.reportedAt).length;
  const b = repairBadge(data, r);
  const idx = stageIndex(r.stage);

  return (
    <article className="rounded-2xl border border-line bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full p-5 pb-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl font-bold">{r.sno}</h3>
          <Pill tone={b.tone} className="px-2.5 py-1 text-[15px]">
            {b.text}
          </Pill>
        </div>
        <p className="mt-1 text-lg text-ink/80">&ldquo;{r.complaint}&rdquo;</p>
        {r.note && <p className="text-[15px] text-mute">Note: {r.note}</p>}
        <p className="mt-1 flex flex-wrap gap-x-4 text-[15px] text-mute">
          <span>Ward {r.ward}</span>
          <span>Owner: {owner}</span>
          <span>{before ? `Repaired ${before}× before` : "First repair"}</span>
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`Step ${idx + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx("h-1.5 rounded-full", i <= idx ? "bg-navy-900" : "bg-line")} />
          ))}
        </div>
      </button>
      {open && (
        <div className="flex gap-3 px-5 pb-5">
          {r.stage === "reported" && (
            <>
              <LinkButton href={`/light?sno=${r.sno}`} variant="outline" size="lg" className="flex-1 text-base">
                <History size={20} /> History
              </LinkButton>
              {canAct && (
                <Button variant="brand" size="lg" className="flex-[1.3] text-base" onClick={() => act((s, me, now) => notifyOwner(s, me, r.id, now), `${owner} notified`)}>
                  <Bell size={20} /> Notify owner
                </Button>
              )}
            </>
          )}
          {r.stage === "notified" && (
            <>
              {canAct && (
                <Button variant="outline" size="lg" className="flex-1 text-base" onClick={() => act((s, me, now) => remindOwner(s, me, r.id, now), `Reminder sent to ${owner}`)}>
                  <Bell size={20} /> Remind
                </Button>
              )}
              <PhotoInput className="flex-[1.3]" onPhoto={(p) => act((s, me, now) => addAfterPhoto(s, me, r.id, p, now), "After-photo added")}>
                <span className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-3 text-base font-semibold whitespace-nowrap text-navy-900 hover:bg-brand-strong">
                  <Camera size={20} /> Add after-photo
                </span>
              </PhotoInput>
            </>
          )}
          {r.stage === "photo" && (
            <>
              <Button variant="outline" size="lg" className="flex-1 text-base" onClick={() => setView(true)}>
                <ImageIcon size={20} /> After-photo
              </Button>
              {canAct && (
                <Button variant="ok" size="lg" className="flex-[1.3] text-base" onClick={() => act((s, me, now) => markRepaired(s, me, r.id, now), "Marked repaired · owner notified")}>
                  <Check size={20} /> Mark repaired
                </Button>
              )}
            </>
          )}
          {r.stage === "repaired" && (
            <LinkButton href={`/light?sno=${r.sno}`} variant="outline" size="lg" className="flex-1 text-base">
              <History size={20} /> Open history
            </LinkButton>
          )}
        </div>
      )}
      <Sheet open={view} onClose={() => setView(false)} title={`After-photo · ${r.sno}`}>
        <PhotoBox src={r.afterPhoto} alt={`After-maintenance photo of ${r.sno}`} label={r.afterPhoto ? undefined : "After-maintenance photo"} className="aspect-[4/3] w-full rounded-2xl" icon={48} />
        <p className="mt-3 text-[15px] text-mute">
          Added {r.afterPhotoAt ? day(r.afterPhotoAt) : ""} by {data.users.find((u) => u.id === r.afterPhotoBy)?.name ?? "the owner"}
        </p>
      </Sheet>
    </article>
  );
}

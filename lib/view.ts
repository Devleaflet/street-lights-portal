// Presentation helpers shared by screens: status → label/tone, KPI counts.
import { openRepairFor } from "./portal";
import type { Light, Repair, State } from "./types";

export type Tone = "ok" | "pend" | "bad" | "wait" | "navy" | "brand" | "mute";

export interface Shown {
  key: "working" | "pending" | "damaged" | "awaiting" | "returned";
  label: string;
  tone: Tone;
}

/** A light with an open repair shows as damaged; "awaiting" = owner notified, after-photo not in yet. */
export function shownStatus(s: State, l: Light): Shown {
  if (l.status === "pending") return { key: "pending", label: "Pending", tone: "pend" };
  if (l.status === "returned") return { key: "returned", label: "Sent back", tone: "bad" };
  const r = openRepairFor(s, l.id);
  if (r?.stage === "notified") return { key: "awaiting", label: "Damaged", tone: "bad" };
  if (r) return { key: "damaged", label: "Damaged", tone: "bad" };
  return { key: "working", label: "Working", tone: "ok" };
}

export const STAGES: { key: Repair["stage"]; label: string; short: string; hint: string }[] = [
  { key: "reported", label: "Reported", short: "New report", hint: "Ward officers reported these. Notify the owner to start the repair." },
  { key: "notified", label: "Owner notified", short: "Owner notified", hint: "Waiting for the installer to fix and add an after-maintenance photo." },
  { key: "photo", label: "Photo added", short: "After-photo added", hint: "The after-photo is in. Check it, then mark the light repaired." },
  { key: "repaired", label: "Repaired (7 days)", short: "Repaired", hint: "Back to working in the last 7 days." },
];
export const stageTone: Record<Repair["stage"], Tone> = { reported: "bad", notified: "pend", photo: "wait", repaired: "ok" };
export const stageIndex = (st: Repair["stage"]) => STAGES.findIndex((x) => x.key === st);

export function kpis(s: State, lights: Light[]) {
  const open = new Map(s.repairs.filter((r) => r.stage !== "repaired").map((r) => [r.lightId, r]));
  const live = lights.filter((l) => l.status !== "returned");
  const damaged = live.filter((l) => open.has(l.id));
  return {
    total: live.length,
    working: live.filter((l) => l.status !== "pending" && !open.has(l.id)).length,
    pending: live.filter((l) => l.status === "pending").length,
    damaged: damaged.length,
    awaitingPhoto: damaged.filter((l) => open.get(l.id)!.stage === "notified").length,
  };
}

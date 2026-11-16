"use client";
import { Check, ChevronRight, CircleCheck, Download, MapPin, UserPlus, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { approveLight, markRepaired, notifyOwner, addAfterPhoto, openRepairFor } from "@/lib/portal";
import { act } from "@/lib/store";
import { daysBetween, gpsQuality, plural, when } from "@/lib/format";
import { kpis, STAGES, stageTone } from "@/lib/view";
import { CityMap, MapLegend } from "./city-map";
import { Dot, Kpi } from "./kpi";
import { usePortal } from "./shell";
import { Button, Panel, PhotoBox, Pill, Segmented, cx } from "./ui";
import { ExportSheet, LightRow, PhotoInput } from "./widgets";

export function AdminDesktop() {
  const { data, me } = usePortal();
  const [ward, setWard] = useState<number | undefined>();
  const [view, setView] = useState<"map" | "list">("map");
  const [sel, setSel] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const lights = ward ? data.lights.filter((l) => l.ward === ward) : data.lights;
  const k = kpis(data, lights);
  const added = lights.filter((l) => l.status !== "pending" && daysBetween(l.installedAt) <= 30).length;
  const live = k.total - k.pending;
  const pending = lights.filter((l) => l.status === "pending").sort((a, b) => a.installedAt.localeCompare(b.installedAt));
  const repairs = data.repairs.filter((r) => r.stage !== "repaired" && (!ward || r.ward === ward)).sort((a, b) => a.reportedAt.localeCompare(b.reportedAt) * -1);
  const signups = data.users.filter((u) => u.status === "pending").length;
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? "";
  const problems = lights.filter((l) => l.status === "pending" || openRepairFor(data, l.id)).slice(0, 40);

  return (
    <div className="space-y-5 px-8 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">City overview</h1>
          <p className="text-mute">{ward ? `Ward ${ward}` : "All 9 wards"} · updated live</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filter by ward">
          <button type="button" onClick={() => setWard(undefined)} aria-pressed={!ward} className={cx("h-10 rounded-full px-4 text-sm font-semibold", !ward ? "bg-navy-900 text-white" : "border border-line bg-white")}>
            All wards
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
            <button key={w} type="button" onClick={() => setWard(w)} aria-pressed={ward === w} className={cx("size-10 rounded-full text-sm", ward === w ? "bg-navy-900 font-semibold text-white" : "border border-line bg-white")}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Total lights" value={k.total} sub={`+${added} this month`} href="/admin/lights" />
        <Kpi label="Working" value={k.working} dot={Dot.working} sub={`${live ? ((k.working / live) * 100).toFixed(1) : 100}% uptime`} subTone="ok" href="/admin/map" />
        <Kpi label="Pending approval" value={k.pending} dot={Dot.pending} sub={pending[0] ? `Oldest: ${plural(Math.max(1, daysBetween(pending[0].installedAt)), "day")}` : "Nothing waiting"} href="/admin/approvals" />
        <Kpi label="Damaged" value={k.damaged} dot={Dot.damaged} sub={`${k.awaitingPhoto} waiting on after-photo`} subTone="bad" href="/admin/repairs" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-4">
        <Panel
          title={ward ? `Map · Ward ${ward}` : "Map · all wards"}
          icon={<MapPin />}
          className="overflow-hidden"
          right={<Segmented value={view} onChange={setView} className="w-36 [&>button]:h-8" options={[{ value: "map", label: "Map" }, { value: "list", label: "List" }]} />}
        >
          {view === "map" ? (
            <>
              <CityMap data={data} lights={lights} ward={ward} selected={sel} onSelect={(l) => setSel(l?.id ?? null)} onWard={setWard} className="h-[420px]" />
              <MapLegend className="px-4 py-3" />
            </>
          ) : (
            <div className="h-[463px] divide-y divide-line overflow-y-auto">
              {problems.map((l) => (
                <LightRow key={l.id} data={data} light={l} sub={`Ward ${l.ward} · ${name(l.ownerId)}`} />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Waiting for approval"
          icon={<CircleCheck />}
          right={
            <Link href="/admin/approvals" className="text-sm font-semibold text-link underline">
              See all {pending.length}
            </Link>
          }
          bodyClassName="flex flex-col"
        >
          <div className="flex-1 divide-y divide-line">
            {pending.slice(0, 5).map((l) => {
              const q = gpsQuality(l.accuracy);
              return (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <PhotoBox src={l.photo} alt={`Photo of ${l.sno}`} className="size-12 shrink-0 rounded-xl" icon={18} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold">{l.sno}</p>
                    <p className={cx("truncate text-[13px]", q.tone === "bad" ? "font-medium text-brand-ink" : "text-mute")}>
                      Ward {l.ward} · {q.tone === "bad" ? `GPS ±${l.accuracy} m — check location` : `${name(l.ownerId)} · GPS ±${l.accuracy} m`}
                    </p>
                  </div>
                  {q.tone === "bad" ? (
                    <Link href={`/admin/approvals?id=${l.id}`} aria-label={`Review ${l.sno}`} className="grid size-11 place-items-center rounded-xl border border-line hover:bg-canvas">
                      <ChevronRight size={20} />
                    </Link>
                  ) : (
                    <button type="button" aria-label={`Approve ${l.sno}`} onClick={() => act((s, m, now) => approveLight(s, m, l.id, now), `${l.sno} approved`)} className="grid size-11 place-items-center rounded-xl bg-ok-soft text-ok hover:bg-ok hover:text-white">
                      <Check size={20} />
                    </button>
                  )}
                </div>
              );
            })}
            {!pending.length && <p className="p-4 text-mute">Nothing waiting.</p>}
          </div>
          {signups > 0 && (
            <div className="m-3 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm">
              <UserPlus size={18} className="text-mute" />
              <span className="flex-1">{plural(signups, "installer sign-up")} to approve</span>
              <Link href="/admin/users" className="font-semibold text-link underline">
                Review
              </Link>
            </div>
          )}
        </Panel>
      </div>
      <OpenRepairs repairs={repairs} onExport={() => setExportOpen(true)} />
      <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} data={data} me={me} initialWard={ward} />
    </div>
  );
}

export function RepairAction({ id, stage }: { id: string; stage: string }) {
  if (stage === "reported")
    return (
      <Button variant="brand" size="sm" className="h-10 px-4" onClick={() => act((s, m, now) => notifyOwner(s, m, id, now), "Owner notified")}>
        Notify owner
      </Button>
    );
  if (stage === "notified")
    return (
      <PhotoInput onPhoto={(p) => act((s, m, now) => addAfterPhoto(s, m, id, p, now), "After-photo added")}>
        <span className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas">Add photo</span>
      </PhotoInput>
    );
  return (
    <Button variant="ok" size="sm" className="h-10 px-4" onClick={() => act((s, m, now) => markRepaired(s, m, id, now), "Marked repaired · owner notified")}>
      Mark repaired
    </Button>
  );
}

function OpenRepairs({ repairs, onExport }: { repairs: ReturnType<typeof usePortal>["data"]["repairs"]; onExport: () => void }) {
  return (
    <Panel
      title="Open repairs"
      icon={<Wrench />}
      className="overflow-hidden"
      right={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download size={16} /> Export
          </Button>
          <Link href="/admin/repairs" className="inline-flex h-9 items-center rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white hover:bg-navy-800">
            Open board
          </Link>
        </div>
      }
    >
      <table className="w-full text-left text-[15px]">
        <thead className="border-b border-line bg-canvas/60 text-xs tracking-wider text-mute uppercase">
          <tr>
            <th className="px-4 py-2.5 font-semibold">SNO</th>
            <th className="px-4 py-2.5 font-semibold">Ward</th>
            <th className="px-4 py-2.5 font-semibold">Complaint</th>
            <th className="px-4 py-2.5 font-semibold">Reported</th>
            <th className="px-4 py-2.5 font-semibold">Stage</th>
            <th className="px-4 py-2.5 text-right font-semibold">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {repairs.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-display font-bold">
                <Link href={`/light?sno=${r.sno}`} className="hover:underline">
                  {r.sno}
                </Link>
              </td>
              <td className="px-4 py-3">{r.ward}</td>
              <td className="px-4 py-3">{r.complaint}</td>
              <td className="px-4 py-3 text-mute">{when(r.reportedAt)}</td>
              <td className="px-4 py-3">
                <Pill tone={stageTone[r.stage]}>{STAGES.find((x) => x.key === r.stage)!.short}</Pill>
              </td>
              <td className="px-4 py-2 text-right">
                <RepairAction id={r.id} stage={r.stage} />
              </td>
            </tr>
          ))}
          {!repairs.length && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-mute">
                No open repairs. Every light is working.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}



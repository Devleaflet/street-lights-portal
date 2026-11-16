"use client";
import { ChevronRight, Download, MapPin, TriangleAlert } from "lucide-react";
import { CityMap, MapLegend } from "@/components/city-map";
import Link from "next/link";
import { useState } from "react";
import { AppShell, Hero, HeroStat, usePortal } from "@/components/shell";
import { BellLink, Button, Empty, Panel, Pill } from "@/components/ui";
import { ExportSheet } from "@/components/widgets";
import { when } from "@/lib/format";
import { visibleLights, visibleRepairs } from "@/lib/portal";
import { kpis, STAGES, stageTone } from "@/lib/view";

export default function Page() {
  return (
    <AppShell roles={["ward"]}>
      <WardHome />
    </AppShell>
  );
}

function WardHome() {
  const { data, me, unread } = usePortal();
  const [exp, setExp] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const lights = visibleLights(data, me);
  const k = kpis(data, lights);
  const reports = visibleRepairs(data, me).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const open = reports.filter((r) => r.stage !== "repaired");
  const recent = reports.filter((r) => r.stage === "repaired").slice(0, 5);

  const Report = ({ r }: { r: (typeof reports)[number] }) => (
    <Link href={`/light?sno=${r.sno}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-canvas">
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold">{r.sno}</span>
        <span className="block truncate text-[15px] text-mute">
          &ldquo;{r.complaint}&rdquo; · {when(r.reportedAt)}
          {r.reportedBy === me.id ? " · by you" : ""}
        </span>
      </span>
      <Pill tone={stageTone[r.stage]}>{STAGES.find((s) => s.key === r.stage)!.short}</Pill>
      <ChevronRight size={18} className="text-mute" />
    </Link>
  );

  return (
    <>
      <Hero title={`Ward ${me.ward}`} sub={`${me.name} · Ward officer`} right={<BellLink count={unread} />}>
        <div className="grid grid-cols-3 gap-3">
          <HeroStat value={k.total} label="Lights" />
          <HeroStat value={k.working} label="Working" />
          <HeroStat value={k.damaged} label="Damaged" accent />
        </div>
      </Hero>
      <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:px-8">
        <div className="min-w-0 space-y-5">
        <Link href="/ward/report" className="flex items-center gap-4 rounded-2xl bg-bad-strong p-4 text-white hover:bg-bad-ink">
          <span className="grid size-14 place-items-center rounded-xl bg-white/15">
            <TriangleAlert size={28} />
          </span>
          <span className="flex-1">
            <span className="block text-xl font-bold">Report damage</span>
            <span className="block text-white/85">Tap the pin or type the SNO</span>
          </span>
          <ChevronRight />
        </Link>

        <section id="reports">
          <h2 className="mb-3 text-xl font-semibold">Open reports · {open.length}</h2>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {open.map((r) => (
              <Report key={r.id} r={r} />
            ))}
            {!open.length && <Empty icon={<TriangleAlert size={24} />} title="No open reports">Every light in your ward is working.</Empty>}
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-semibold">Recently repaired</h2>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {recent.map((r) => (
                <Report key={r.id} r={r} />
              ))}
            </div>
          </section>
        )}

        </div>
        <div className="min-w-0 space-y-4">
        <Panel title={`Ward ${me.ward} map`} icon={<MapPin />} className="overflow-hidden">
          <CityMap data={data} lights={lights} ward={me.ward} selected={sel} onSelect={(l) => setSel(l?.id ?? null)} className="h-72 lg:h-[420px]" />
          <MapLegend className="border-t border-line px-4 py-3" />
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/ward/lights" className="flex h-14 items-center justify-center rounded-2xl border border-line bg-white font-semibold hover:bg-canvas">
            All {lights.length} lights
          </Link>
          <Button variant="outline" size="lg" className="text-base" onClick={() => setExp(true)}>
            <Download size={20} /> Export
          </Button>
        </div>
        </div>
      </div>
      <ExportSheet open={exp} onClose={() => setExp(false)} data={data} me={me} />
    </>
  );
}

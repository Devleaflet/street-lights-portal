"use client";
import { ChevronRight, MapPin, Plus, Search, Undo2, WifiOff, Wrench } from "lucide-react";
import { CityMap } from "@/components/city-map";
import Link from "next/link";
import { useState } from "react";
import { AppShell, Hero, HeroStat, usePortal } from "@/components/shell";
import { BellLink, Empty, LampIcon, Panel, Pill, Segmented } from "@/components/ui";
import { Pager, usePaged } from "@/components/pager";
import { LightRow } from "@/components/widgets";
import { day } from "@/lib/format";
import { visibleLights } from "@/lib/portal";

export default function Page() {
  return (
    <AppShell roles={["installer"]}>
      <MyLights />
    </AppShell>
  );
}

function MyLights() {
  const { data, me, unread, outbox, offline } = usePortal();
  const [tab, setTab] = useState<"all" | "pending" | "approved">("all");
  const [q, setQ] = useState("");

  const mine = visibleLights(data, me).sort((a, b) => b.installedAt.localeCompare(a.installedAt));
  const queued = outbox.filter((o) => o.userId === me.id);
  const approved = mine.filter((l) => l.status === "working" || l.status === "damaged");
  const pending = mine.filter((l) => l.status === "pending" || l.status === "returned");
  const todo = data.repairs.filter((r) => r.stage === "notified" && mine.some((l) => l.id === r.lightId));
  const returned = mine.filter((l) => l.status === "returned");
  const query = q.trim().toUpperCase();
  const list = (tab === "all" ? mine : tab === "pending" ? pending : approved).filter((l) => !query || l.sno.includes(query) || `WARD ${l.ward}` === query);
  const pg = usePaged(list, `${tab}|${query}`, 10);
  const showQueued = tab !== "approved";

  return (
    <>
      <Hero title="My lights" sub={`${me.name} · Installer`} right={<BellLink count={unread} />}>
        <div className="grid grid-cols-3 gap-3">
          <HeroStat value={approved.length} label="Approved" />
          <HeroStat value={pending.length} label="Pending" />
          <HeroStat value={queued.length} label="To upload" accent />
        </div>
      </Hero>

      <div className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-5 lg:px-8">
        <aside className="space-y-4 lg:order-2">
        {offline && (
          <p className="flex items-center gap-2 rounded-xl bg-pend-soft px-4 py-3 text-[15px] text-pend-ink">
            <WifiOff size={18} /> No signal. New lights are saved on this phone and upload automatically.
          </p>
        )}
        {todo.map((r) => (
          <Link key={r.id} href={`/light?sno=${r.sno}`} className="flex items-center gap-4 rounded-2xl border-2 border-brand bg-brand-wash p-4 hover:bg-brand-soft/50">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand text-navy-900">
              <Wrench size={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold tracking-wide text-brand-ink">TO DO · REPAIR</span>
              <span className="block font-display text-xl font-bold">
                {r.sno} · Ward {r.ward}
              </span>
              <span className="block text-[15px] text-mute">Fix, then add the after-photo</span>
            </span>
            <ChevronRight className="text-mute" />
          </Link>
        ))}
        {returned.map((l) => (
          <Link key={l.id} href={`/light?sno=${l.sno}`} className="flex items-center gap-4 rounded-2xl border border-bad/40 bg-white p-4 hover:bg-canvas">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-bad-soft text-bad-ink">
              <Undo2 size={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold tracking-wide text-bad-ink">SENT BACK</span>
              <span className="block font-display text-xl font-bold">{l.sno}</span>
              <span className="block truncate text-[15px] text-mute">{l.returnReason} · fix and resubmit</span>
            </span>
            <ChevronRight className="text-mute" />
          </Link>
        ))}
        <Panel title="My lights on the map" icon={<MapPin />} className="hidden overflow-hidden lg:flex">
          <CityMap data={data} lights={mine} wardLabels popover={false} className="h-64" />
          <Link href="/installer/map" className="block border-t border-line px-4 py-3 text-sm font-semibold text-link hover:bg-canvas">
            Open full map →
          </Link>
        </Panel>
        </aside>

        <div className="min-w-0 space-y-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
          ]}
          className="h-14 [&>button]:h-12"
        />
        <label className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-4 focus-within:border-navy-700">
          <Search size={18} className="text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my lights by SNO" aria-label="Search my lights" autoCapitalize="characters" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none" />
        </label>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="divide-y divide-line">
            {showQueued &&
              queued.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-photo text-mute">
                    <WifiOff size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold">{o.input.sno}</p>
                    <p className="text-[15px] text-mute">Ward {o.input.ward} · just now</p>
                  </div>
                  <Pill tone="wait">Waiting to upload</Pill>
                </div>
              ))}
            {pg.rows.map((l) => (
              <LightRow key={l.id} data={data} light={l} sub={`Ward ${l.ward} · ${l.repairCount ? `repaired ${l.repairCount}×` : day(l.installedAt)}`} />
            ))}
          </div>
          {!list.length && !(showQueued && queued.length) && (
            <Empty icon={<LampIcon className="size-7" />} title="No lights here yet">
              Tap Add light while standing under a new light.
            </Empty>
          )}
          <Pager pg={pg} sizes={[10, 25, 50]} />
        </div>
        </div>
      </div>

      <Link href="/add-light" className="fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-16 items-center gap-2 rounded-2xl bg-brand px-6 text-xl font-bold text-navy-900 shadow-lg shadow-navy-900/20 hover:bg-brand-strong lg:hidden">
        <Plus size={26} /> Add light
      </Link>
    </>
  );
}

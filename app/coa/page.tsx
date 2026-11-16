"use client";
import { Download, Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppShell, Hero, HeroStat, usePortal } from "@/components/shell";
import { BellLink, Button } from "@/components/ui";
import { ExportSheet } from "@/components/widgets";
import { visibleLights, wardStats } from "@/lib/portal";
import { kpis } from "@/lib/view";

export default function Page() {
  return (
    <AppShell roles={["coa"]}>
      <AllWards />
    </AppShell>
  );
}

function AllWards() {
  const { data, me, unread } = usePortal();
  const [exp, setExp] = useState(false);
  const stats = wardStats(data, me);
  const max = Math.max(...stats.map((w) => w.total));
  const k = kpis(data, visibleLights(data, me));
  const dmg = (w: number) => data.repairs.filter((r) => r.ward === w && r.stage !== "repaired").length;

  return (
    <>
      <Hero
        title="All wards"
        sub="COA · every ward, with photos and repair history"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/85 px-3.5 text-[15px] font-semibold text-navy-900 lg:bg-pend-soft">
              <Eye size={18} /> View only
            </span>
            <span className="hidden lg:block">
              <Button variant="dark" onClick={() => setExp(true)}>
                <Download size={18} /> Export to Excel
              </Button>
            </span>
          </div>
        }
        right={<BellLink count={unread} />}
      >
        <div className="grid grid-cols-3 gap-3">
          <HeroStat value={k.total} label="Lights" />
          <HeroStat value={k.working} label="Working" />
          <HeroStat value={k.damaged} label="Damaged" accent />
        </div>
      </Hero>
      <div className="space-y-4 px-4 py-5 lg:px-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((w) => (
            <Link key={w.ward} href={`/coa/lights?ward=${w.ward}`} className="block rounded-2xl border border-line bg-white px-5 py-4 hover:bg-canvas">
              <div className="flex items-center gap-4">
                <span className="w-20 shrink-0 text-xl font-bold">Ward {w.ward}</span>
                <span className="h-3 flex-1 rounded-full bg-line" aria-hidden>
                  <span className="block h-full rounded-full bg-ok-strong" style={{ width: `${(w.total / max) * 100}%` }} />
                </span>
                <span className="tabular w-8 text-right text-lg text-mute">{w.total}</span>
              </div>
              {dmg(w.ward) > 0 && <p className="mt-1 pl-24 text-sm font-medium text-bad-ink">{dmg(w.ward)} damaged</p>}
            </Link>
          ))}
        </div>
        <p className="text-[15px] text-mute">Tap a ward to see every light with photos and repair history. COA can look and export, but can&apos;t add, edit or report.</p>
      </div>
      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 px-4 pb-3 lg:hidden">
        <Button variant="dark" size="lg" className="w-full shadow-lg" onClick={() => setExp(true)}>
          <Download size={22} /> Export to Excel
        </Button>
      </div>
      <ExportSheet open={exp} onClose={() => setExp(false)} data={data} me={me} />
    </>
  );
}

"use client";
import { Bell, ChevronRight, LogOut, RotateCcw, TriangleAlert, WifiOff, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ROLE_LABEL, initials } from "@/lib/format";
import { openRepairFor, visibleLights } from "@/lib/portal";
import { resetDemo, setSimulatedOffline, signOut } from "@/lib/store";
import { CityMap, MapLegend } from "./city-map";
import { usePortal } from "./shell";
import { BellLink, Chip, Panel, cx } from "./ui";
import { LightRow } from "./widgets";

export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="border-b border-line bg-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 lg:border-0 lg:bg-transparent lg:px-8 lg:pt-7 lg:pb-1">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] leading-tight font-bold lg:text-3xl">{title}</h1>
          {sub && <p className="text-[15px] text-mute">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function MapScreen() {
  const { data, me, unread } = usePortal();
  const lights = visibleLights(data, me);
  const wards = [...new Set(lights.map((l) => l.ward))].sort();
  const [ward, setWard] = useState<number | undefined>(me.role === "ward" ? me.ward : me.role === "installer" && wards.length === 1 ? wards[0] : undefined);
  const [sel, setSel] = useState<string | null>(null);
  const shown = ward ? lights.filter((l) => l.ward === ward) : lights;
  const problems = shown.filter((l) => openRepairFor(data, l.id) || l.status === "pending").slice(0, 30);
  const sub = me.role === "ward" ? `Ward ${me.ward} · your ward only` : me.role === "installer" ? `Your ${lights.length} lights` : `${shown.length} lights · tap a pin`;

  return (
    <>
      <PageHeader title="Map" sub={sub} right={<span className="lg:hidden"><BellLink count={unread} dark={false} /></span>} />
      <div className="space-y-3 px-4 py-4 lg:px-8">
        {me.role !== "ward" && wards.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={!ward} onClick={() => (setWard(undefined), setSel(null))} className="h-10 shrink-0 rounded-full">
              All wards
            </Chip>
            {wards.map((w) => (
              <Chip key={w} active={ward === w} onClick={() => (setWard(w), setSel(null))} className="h-10 shrink-0 rounded-full px-3.5">
                Ward {w}
              </Chip>
            ))}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <CityMap data={data} lights={shown} ward={ward} selected={sel} onSelect={(l) => setSel(l?.id ?? null)} onWard={(w) => (setWard(w), setSel(null))} className="h-[58dvh] min-h-80 lg:h-[calc(100dvh-15rem)]" />
          <MapLegend className="px-4 py-3" />
        </div>
        {problems.length > 0 && (
          <Panel title="Needs attention here" icon={<TriangleAlert />} className="h-fit overflow-hidden lg:max-h-[calc(100dvh-11rem)]" bodyClassName="overflow-y-auto">
            <div className="divide-y divide-line">
              {problems.map((l) => (
                <LightRow key={l.id} data={data} light={l} sub={`Ward ${l.ward}${openRepairFor(data, l.id) ? ` · ${openRepairFor(data, l.id)!.complaint}` : ""}`} />
              ))}
            </div>
          </Panel>
        )}
        </div>
      </div>
    </>
  );
}

export function Row({ icon: Icon, label, sub, href, onClick, right, tone }: { icon: LucideIcon; label: string; sub?: string; href?: string; onClick?: () => void; right?: ReactNode; tone?: "bad" }) {
  const inner = (
    <>
      <span className={cx("grid size-11 shrink-0 place-items-center rounded-xl", tone === "bad" ? "bg-bad-soft text-bad-ink" : "bg-pend-soft text-navy-900")}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={cx("block font-semibold", tone === "bad" && "text-bad-ink")}>{label}</span>
        {sub && <span className="block text-sm text-mute">{sub}</span>}
      </span>
      {right ?? (href && <ChevronRight size={20} className="text-mute" />)}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 hover:bg-canvas";
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

export function ProfileScreen({ extra }: { extra?: ReactNode }) {
  const { me, offline, unread } = usePortal();
  const [sure, setSure] = useState(false);
  return (
    <>
      <PageHeader title={me.role === "admin" ? "More" : "Profile"} />
      <div className="grid gap-4 px-4 py-5 lg:grid-cols-2 lg:items-start lg:px-8 [&>*]:min-w-0">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-navy-900 font-display text-xl font-bold text-brand">{initials(me.name)}</span>
          <div className="min-w-0">
            <p className="text-xl font-bold">{me.name}</p>
            <p className="text-mute">
              {ROLE_LABEL[me.role]}
              {me.ward ? ` · Ward ${me.ward}` : ""}
            </p>
            <p className="truncate text-sm text-mute">{me.email}</p>
          </div>
        </div>
        {extra}
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          <Row icon={Bell} label="Notifications" sub={unread ? `${unread} unread` : "In the bell only, never email or SMS"} href="/notifications" />
          {me.role === "installer" && (
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-canvas">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pend-soft text-navy-900">
                <WifiOff size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">Simulate no signal</span>
                <span className="block text-sm text-mute">Demo the offline save-and-upload flow</span>
              </span>
              <input type="checkbox" checked={offline} onChange={(e) => setSimulatedOffline(e.target.checked)} className="size-6 accent-navy-900" />
            </label>
          )}
          <Row icon={RotateCcw} label={sure ? "Tap again to reset everything" : "Reset demo data"} sub="Back to the original 642 lights" onClick={() => (sure ? (resetDemo(), setSure(false)) : setSure(true))} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <Row icon={LogOut} label="Log out" sub="Switch to another demo account" onClick={signOut} tone="bad" />
        </div>
      </div>
    </>
  );
}

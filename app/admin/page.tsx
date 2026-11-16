"use client";
import { ChevronRight, CircleCheck, TriangleAlert, UserPlus, Camera } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminDesktop } from "@/components/admin-desktop";
import { Dot, Kpi } from "@/components/kpi";
import { AppShell, SnoSearch, usePortal } from "@/components/shell";
import { BellLink, Logo, cx } from "@/components/ui";
import { clock, daysBetween, plural, when } from "@/lib/format";
import { wardStats } from "@/lib/portal";
import { toast } from "@/lib/store";
import { kpis } from "@/lib/view";

export default function AdminHome() {
  return (
    <AppShell roles={["admin"]}>
      <div className="lg:hidden">
        <AdminMobile />
      </div>
      <div className="hidden lg:block">
        <AdminDesktop />
      </div>
    </AppShell>
  );
}

export const scanUnavailable = () => toast("Barcode scanning needs the phone camera app in the real build. Type the SNO for this demo.");

function Attention({ href, icon, title, sub, tone }: { href: string; icon: ReactNode; title: string; sub: string; tone?: "bad" }) {
  return (
    <Link href={href} className={cx("flex items-center gap-4 rounded-2xl border bg-white p-4 transition-colors hover:bg-canvas", tone === "bad" ? "border-bad/40" : "border-line")}>
      <span className={cx("grid size-14 shrink-0 place-items-center rounded-xl", tone === "bad" ? "bg-bad-soft text-bad-ink" : "bg-pend-soft text-navy-900")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block truncate text-[15px] text-mute">{sub}</span>
      </span>
      <ChevronRight className="text-mute" />
    </Link>
  );
}

function AdminMobile() {
  const { data, me, unread } = usePortal();
  const k = kpis(data, data.lights);
  const pending = data.lights.filter((l) => l.status === "pending").sort((a, b) => a.installedAt.localeCompare(b.installedAt));
  const reports = data.repairs.filter((r) => r.stage === "reported");
  const photos = data.repairs.filter((r) => r.stage === "photo");
  const signups = data.users.filter((u) => u.status === "pending");
  const wards = wardStats(data, me);
  const dmg = (w: number) => data.repairs.filter((r) => r.ward === w && r.stage !== "repaired").length;

  return (
    <>
      <section className="bg-navy-900 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-7 text-white">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex-1 leading-tight">
            <p className="font-display text-xl font-bold">Street Light Portal</p>
            <p className="text-white/70">Admin</p>
          </div>
          <BellLink count={unread} />
        </div>
        <SnoSearch className="mt-5 h-14" scan={scanUnavailable} />
      </section>

      <div className="space-y-6 px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Total lights" value={k.total} />
          <Kpi label="Working" value={k.working} dot={Dot.working} />
          <Kpi label="Pending" value={k.pending} dot={Dot.pending} />
          <Kpi label="Damaged" value={k.damaged} dot={Dot.damaged} />
        </div>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Needs your attention</h2>
          <div className="space-y-3">
            {pending.length > 0 && (
              <Attention href="/admin/approvals" icon={<CircleCheck size={26} />} title={`${plural(pending.length, "light")} to approve`} sub={`Oldest waiting ${plural(Math.max(1, daysBetween(pending[0].installedAt)), "day")}`} />
            )}
            {reports.length > 0 && (
              <Attention
                href="/admin/repairs"
                tone="bad"
                icon={<TriangleAlert size={26} />}
                title={`${reports.length} new damage report${reports.length > 1 ? "s" : ""}`}
                sub={`${reports[0].sno} · Ward ${reports[0].ward} · ${daysBetween(reports[0].reportedAt) ? when(reports[0].reportedAt) : clock(reports[0].reportedAt)}`}
              />
            )}
            {photos.length > 0 && <Attention href="/admin/repairs?stage=photo" icon={<Camera size={26} />} title={`${plural(photos.length, "after-photo")} to check`} sub="Ready to mark repaired" />}
            {signups.length > 0 && <Attention href="/admin/users" icon={<UserPlus size={26} />} title={`${plural(signups.length, "installer sign-up")}`} sub="Approve or decline" />}
            {!pending.length && !reports.length && !signups.length && !photos.length && <p className="rounded-2xl border border-line bg-white p-4 text-mute">All clear. Nothing is waiting on you.</p>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Lights by ward</h2>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-white p-2.5">
            {wards.map((w) => (
              <Link key={w.ward} href={`/admin/lights?ward=${w.ward}`} className={cx("rounded-xl px-2.5 py-2.5", dmg(w.ward) ? "bg-bad-soft text-bad-ink" : "bg-canvas")}>
                <span className="block text-[13px] leading-snug tracking-tight whitespace-nowrap">
                  Ward {w.ward}
                  {dmg(w.ward) ? ` · ${dmg(w.ward)} dmg` : ""}
                </span>
                <span className="tabular block font-display text-2xl font-bold text-ink">{w.total}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

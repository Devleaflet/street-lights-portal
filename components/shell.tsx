"use client";
import {
  Bell,
  CircleCheck,
  Download,
  LayoutGrid,
  List,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  TriangleAlert,
  User as UserIcon,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ROLE_LABEL, initials } from "@/lib/format";
import { signOut, useSnap } from "@/lib/store";
import type { Role, State, User } from "@/lib/types";
import { BellLink, LampIcon, Logo, Spinner, cx } from "./ui";

export const HOME: Record<Role, string> = { admin: "/admin", installer: "/installer", ward: "/ward", coa: "/coa" };

type Badge = { text: string; tone: "pend" | "bad" | "brand" } | null;
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon | typeof LampIcon;
  badge?: (s: State, me: User) => Badge;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const count = (n: number, tone: "pend" | "bad" | "brand" = "pend"): Badge => (n ? { text: String(n), tone } : null);
const unreadBadge = (s: State, me: User) => count(s.notifications.filter((n) => n.to === me.id && !n.read).length, "brand");
const NOTES: NavItem = { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadBadge };

const SIDEBAR: Record<Role, NavGroup[]> = {
  admin: [
    {
      title: "Main",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutGrid },
        { href: "/admin/map", label: "Map", icon: MapPin },
        { href: "/admin/lights", label: "Lights", icon: LampIcon },
      ],
    },
    {
      title: "Operations",
      items: [
        { href: "/admin/approvals", label: "Approvals", icon: CircleCheck, badge: (s) => count(s.lights.filter((l) => l.status === "pending").length) },
        { href: "/admin/repairs", label: "Repairs", icon: Wrench, badge: (s) => count(s.repairs.filter((r) => r.stage !== "repaired").length, "bad") },
        { href: "/admin/exports", label: "Exports", icon: Download },
      ],
    },
    {
      title: "People",
      items: [
        {
          href: "/admin/users",
          label: "Users",
          icon: Users,
          badge: (s) => {
            const n = s.users.filter((u) => u.status === "pending").length;
            return n ? { text: `${n} new`, tone: "pend" } : null;
          },
        },
        { href: "/admin/messages", label: "Messages", icon: MessageCircle },
        NOTES,
      ],
    },
  ],
  installer: [
    { title: "Main", items: [{ href: "/installer", label: "My lights", icon: List }, { href: "/add-light", label: "Add light", icon: Plus }, { href: "/installer/map", label: "Map", icon: MapPin }] },
    { title: "Account", items: [NOTES, { href: "/installer/profile", label: "Profile", icon: UserIcon }] },
  ],
  ward: [
    {
      title: "Main",
      items: [
        { href: "/ward", label: "My ward", icon: LayoutGrid },
        { href: "/ward/report", label: "Report damage", icon: TriangleAlert },
        { href: "/ward/lights", label: "Lights", icon: LampIcon },
        { href: "/ward/map", label: "Map", icon: MapPin },
      ],
    },
    { title: "Account", items: [NOTES, { href: "/ward/profile", label: "Profile", icon: UserIcon }] },
  ],
  coa: [
    {
      title: "Main",
      items: [
        { href: "/coa", label: "All wards", icon: LayoutGrid },
        { href: "/coa/lights", label: "Lights", icon: LampIcon },
        { href: "/coa/map", label: "Map", icon: MapPin },
      ],
    },
    { title: "Account", items: [NOTES, { href: "/coa/profile", label: "Profile", icon: UserIcon }] },
  ],
};

const BOTTOM: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Home", icon: LayoutGrid },
    { href: "/admin/map", label: "Map", icon: MapPin },
    { href: "/admin/approvals", label: "Approve", icon: CircleCheck },
    { href: "/admin/repairs", label: "Repairs", icon: Wrench },
    { href: "/admin/more", label: "More", icon: Menu },
  ],
  installer: [
    { href: "/installer", label: "My lights", icon: List },
    { href: "/installer/map", label: "Map", icon: MapPin },
    { href: "/installer/profile", label: "Profile", icon: UserIcon },
  ],
  ward: [
    { href: "/ward", label: "My ward", icon: LayoutGrid },
    { href: "/ward/report", label: "Report", icon: TriangleAlert },
    { href: "/ward/map", label: "Map", icon: MapPin },
    { href: "/ward/profile", label: "Profile", icon: UserIcon },
  ],
  coa: [
    { href: "/coa", label: "All wards", icon: LayoutGrid },
    { href: "/coa/lights", label: "Lights", icon: LampIcon },
    { href: "/coa/map", label: "Map", icon: MapPin },
    { href: "/coa/profile", label: "Profile", icon: UserIcon },
  ],
};

const isActive = (path: string, href: string, home: string) => (href === home ? path === href : path.startsWith(href));
const subtitle = (me: User) => (me.role === "ward" ? `Ward ${me.ward} officer` : ROLE_LABEL[me.role]);
const BADGE_TONE = { pend: "bg-pend-soft text-pend-ink", bad: "bg-bad-soft text-bad-ink", brand: "bg-brand text-navy-900" };

/** Non-null portal state for screens rendered inside <AppShell>. */
export function usePortal() {
  const snap = useSnap()!;
  const me = snap.me!;
  const unread = snap.data.notifications.filter((n) => n.to === me.id && !n.read).length;
  return { ...snap, me, unread };
}

export function AppShell({ roles, task, children }: { roles: Role[]; task?: boolean; children: ReactNode }) {
  const snap = useSnap();
  const router = useRouter();
  const path = usePathname();
  const me = snap?.me;
  const allowed = !!me && roles.includes(me.role);

  useEffect(() => {
    if (!snap) return;
    if (!me) router.replace("/");
    else if (!roles.includes(me.role)) router.replace(HOME[me.role]);
  }, [snap, me, roles, router]);

  if (!snap || !me || !allowed) return <Spinner />;

  const home = HOME[me.role];
  const unread = snap.data.notifications.filter((n) => n.to === me.id && !n.read).length;
  const canAdd = me.role === "admin" || me.role === "installer";

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-white px-3 py-3 lg:flex">
        <Link href={home} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-canvas">
          <Logo />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[15px] font-bold">Street Light Portal</span>
            <span className="block truncate text-xs text-mute">{subtitle(me)}</span>
          </span>
        </Link>
        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto" aria-label="Main">
          {SIDEBAR[me.role].map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-mute uppercase">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(path, it.href, home);
                  const b = it.badge?.(snap.data, me);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
                        active ? "bg-brand-soft/60 font-semibold text-ink before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-1 before:rounded-r before:bg-brand-strong" : "text-mute hover:bg-canvas hover:text-ink",
                      )}
                    >
                      <Icon className="size-[18px]" />
                      <span className="flex-1">{it.label}</span>
                      {b && <span className={cx("tabular rounded-md px-1.5 text-[11px] font-bold leading-5", BADGE_TONE[b.tone])}>{b.text}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {me.role === "admin" && (
          <div className="mb-3 rounded-xl bg-canvas p-3">
            <p className="text-[13px] font-semibold">Firebase free plan</p>
            <p className="text-xs text-mute">Today&apos;s reads: 38% of daily limit</p>
            <div className="mt-2 h-1.5 rounded-full bg-line">
              <div className="h-full w-[38%] rounded-full bg-ok" />
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-xs font-bold text-brand">{initials(me.name)}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold">{me.name}</span>
            <span className="block truncate text-xs text-mute">{me.email}</span>
          </span>
          <button type="button" onClick={signOut} aria-label="Log out" title="Log out" className="grid size-9 place-items-center rounded-lg text-mute hover:bg-canvas hover:text-bad-ink">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* desktop top bar */}
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-line bg-white/90 px-6 backdrop-blur lg:flex">
        <SnoSearch className="w-full max-w-sm" placeholder="Look up SNO, e.g. SL-04-0217" />
        <div className="flex-1" />
        <BellLink count={unread} dark={false} />
        {canAdd && (
          <Link href="/add-light" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-semibold text-navy-900 hover:bg-brand-strong">
            <Plus size={20} /> Add light
          </Link>
        )}
      </header>

      <main className={cx(!task && "pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10")}>{children}</main>

      {/* phone bottom nav */}
      {!task && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="mx-auto flex max-w-xl">
            {BOTTOM[me.role].map((it) => {
              const active = isActive(path, it.href, home);
              const Icon = it.icon;
              return (
                <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className="flex h-[76px] flex-1 flex-col items-center justify-center gap-1">
                  <span className={cx("grid h-9 w-16 place-items-center rounded-full transition-colors", active ? "bg-brand-soft text-ink" : "text-mute")}>
                    <Icon className="size-6" />
                  </span>
                  <span className={cx("text-[13px]", active ? "font-bold text-ink" : "text-mute")}>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function SnoSearch({ className, placeholder = "Look up SNO", dark, scan }: { className?: string; placeholder?: string; dark?: boolean; scan?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState("");
  return (
    <form
      role="search"
      className={cx("flex h-11 items-center gap-2 rounded-xl px-3.5", dark ? "border border-navy-700 bg-navy-800 text-white" : scan ? "bg-white text-ink shadow-sm" : "border border-line bg-white text-ink focus-within:border-navy-700", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) router.push(`/light?sno=${encodeURIComponent(v.trim().toUpperCase())}`);
      }}
    >
      <Search size={18} className={dark ? "text-white/60" : "text-mute"} />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label="Look up a light by SNO"
        placeholder={placeholder}
        autoCapitalize="characters"
        enterKeyHint="search"
        className={cx("h-full min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none lg:text-[15px]", dark ? "placeholder:text-white/50" : "placeholder:text-pend")}
      />
      {scan && (
        <button type="button" onClick={scan} className="border-l border-line pl-3 text-[15px] text-mute hover:text-ink">
          Scan
        </button>
      )}
    </form>
  );
}

/**
 * Role home header. Phones: the dark navy block from the mockups.
 * Desktop: a plain page title with the stats as white cards (topbar already has bell/search).
 */
export function Hero({ title, sub, right, actions, children }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-navy-900 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 text-white lg:bg-transparent lg:px-8 lg:pt-7 lg:pb-0 lg:text-ink">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] leading-tight font-bold lg:text-3xl">{title}</h1>
          {sub && <p className="text-[15px] text-white/75 lg:text-mute">{sub}</p>}
        </div>
        {actions}
        {right && <div className="lg:hidden">{right}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export function HeroStat({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-navy-800 px-4 py-3 lg:border lg:border-line lg:bg-white lg:px-5 lg:py-4">
      <p className="hidden text-xs font-semibold tracking-wider text-mute uppercase lg:block">{label}</p>
      <p className={cx("tabular font-display text-[28px] leading-tight font-bold lg:text-[32px]", accent && "text-brand lg:text-brand-strong")}>{value}</p>
      <p className="text-sm text-white/75 lg:hidden">{label}</p>
    </div>
  );
}

/** Standard page body: phone-width column on phones, full width beside the sidebar on desktop. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("px-4 py-5 lg:px-8 lg:py-6", className)}>{children}</div>;
}

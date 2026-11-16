"use client";
import { Bell, ChevronLeft, ImageIcon, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import type { Tone } from "@/lib/view";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Street-lamp glyph used in the logo and "new light" notifications. */
export function LampIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 21V9a5 5 0 0 1 5-5h4.5" />
      <path d="M16.5 4v2.2a1.3 1.3 0 0 0 2.6 0V4" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={cx("grid shrink-0 place-items-center bg-brand text-navy-900", size === "lg" ? "size-14 rounded-2xl" : "size-10 rounded-xl")}>
      <LampIcon className={size === "lg" ? "size-8" : "size-6"} />
    </span>
  );
}

const TONES: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  pend: "bg-pend-soft text-pend-ink",
  bad: "bg-bad-soft text-bad-ink",
  wait: "bg-wait-soft text-wait-ink",
  navy: "bg-navy-900 text-white",
  brand: "bg-brand-soft text-brand-ink",
  mute: "bg-pend-soft text-mute",
};

export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>{children}</span>;
}

type Variant = "brand" | "dark" | "ok" | "danger" | "outline" | "ghost" | "soft";
const VARIANTS: Record<Variant, string> = {
  brand: "bg-brand text-navy-900 hover:bg-brand-strong",
  dark: "bg-navy-900 text-white hover:bg-navy-800",
  ok: "bg-ok text-white hover:bg-ok-strong",
  danger: "bg-bad-strong text-white hover:bg-bad-ink",
  outline: "border border-line bg-white text-ink hover:bg-canvas",
  ghost: "text-ink hover:bg-canvas",
  soft: "bg-canvas text-ink hover:bg-line",
};

export function btn(variant: Variant = "dark", size: "sm" | "md" | "lg" = "md") {
  return cx(
    "inline-flex select-none items-center whitespace-nowrap justify-center gap-2 font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:border-transparent disabled:bg-line disabled:text-mute",
    size === "sm" && "h-9 rounded-lg px-3 text-sm",
    size === "md" && "h-11 rounded-xl px-4 text-[15px]",
    size === "lg" && "h-14 rounded-2xl px-5 text-lg",
    VARIANTS[variant],
  );
}

export function Button({ variant, size, className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button type="button" className={cx(btn(variant, size), className)} {...rest} />;
}

export function LinkButton({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <Link className={cx(btn(variant, size), className)} {...rest} />;
}

export function PhotoBox({ src, alt, className, label, icon = 22 }: { src?: string; alt: string; className?: string; label?: string; icon?: number }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cx("bg-photo object-cover", className)} />;
  return (
    <div role="img" aria-label={alt} className={cx("grid place-items-center bg-photo text-pend", className)}>
      <div className="flex flex-col items-center gap-2">
        <ImageIcon size={icon} strokeWidth={1.8} />
        {label && <span className="text-sm text-mute">{label}</span>}
      </div>
    </div>
  );
}

export function Chip({ active, className, ...rest }: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-xl border px-4 text-[15px] transition-colors",
        active ? "border-navy-900 bg-navy-900 font-semibold text-white" : "border-line bg-white text-ink hover:border-pend",
        className,
      )}
      {...rest}
    />
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx("flex rounded-xl bg-pend-soft p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("h-10 flex-1 rounded-[10px] px-3 text-[15px] transition-colors", value === o.value ? "bg-white font-semibold text-ink shadow-sm" : "text-mute hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** White top bar for task screens (Approve lights, Repairs, Light history…). */
export function TaskBar({ title, sub, close, back, right, onBack }: { title: string; sub?: ReactNode; close?: boolean; back?: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const go = () => (onBack ? onBack() : back ? router.push(back) : history.length > 1 ? router.back() : router.push("/"));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white lg:top-16">
      <div className="flex min-h-16 items-center gap-2 px-3 py-2 lg:px-6">
        <button type="button" onClick={go} aria-label={close ? "Close" : "Back"} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink hover:bg-canvas">
          {close ? <X size={24} /> : <ChevronLeft size={26} />}
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
          {sub && <p className="truncate text-sm text-mute">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function IconButton({ label, className, children, ...rest }: ComponentProps<"button"> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx("grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink hover:bg-canvas", className)} {...rest}>
      {children}
    </button>
  );
}

export function BellLink({ count, dark = true }: { count: number; dark?: boolean }) {
  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      className={cx("relative grid size-12 shrink-0 place-items-center rounded-2xl", dark ? "bg-navy-800 text-white hover:bg-navy-700" : "border border-line bg-white text-ink hover:bg-canvas")}
    >
      <Bell size={22} />
      {count > 0 && <span className="tabular absolute -top-1 -right-1 grid min-w-6 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold leading-6 text-navy-900">{count}</span>}
    </Link>
  );
}

export function Alert({ tone = "wait", children, className }: { tone?: "wait" | "bad"; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex gap-3 rounded-xl px-4 py-3 text-[15px] leading-snug", tone === "wait" ? "bg-wait-soft text-wait-ink" : "bg-bad-soft text-bad-ink", className)}>
      <TriangleAlert size={20} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on desktop. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="animate-fade absolute inset-0 bg-navy-950/50" />
      <div className="animate-rise relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:max-w-lg lg:rounded-[28px] lg:pt-5">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line lg:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-xl bg-canvas hover:bg-line">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, optional }: { label: string; hint?: ReactNode; children: ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-semibold">
        {label} {optional && <span className="font-normal text-mute">(optional)</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-mute">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-pend focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-pend-soft text-mute">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm text-mute">{children}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="mx-auto mt-24 size-8 animate-spin rounded-full border-[3px] border-line border-t-navy-900" aria-label="Loading" />;
}

/** Card with a small uppercase header (icon · LABEL · right slot) — the desktop dashboard card. */
export function Panel({ title, icon, right, children, className, bodyClassName }: { title: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cx("flex flex-col rounded-2xl border border-line bg-white", className)}>
      <header className="flex min-h-14 items-center gap-2 border-b border-line px-4 py-2">
        {icon && <span className="text-mute [&>svg]:size-4">{icon}</span>}
        <h2 className="flex-1 text-xs font-semibold tracking-wider text-mute uppercase">{title}</h2>
        {right}
      </header>
      <div className={cx("flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Sticky bottom actions for task screens: full-width buttons on phones, right-aligned on desktop. */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("sticky bottom-0 z-20 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:px-8", className)}>
      <div className="flex gap-3 lg:justify-end [&>*]:flex-1 lg:[&>*]:min-w-48 lg:[&>*]:flex-none">{children}</div>
    </div>
  );
}

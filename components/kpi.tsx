import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./ui";

export const Dot = {
  working: <span className="size-3 rounded-full bg-ok" />,
  pending: <span className="size-3 rounded-full border-[3px] border-pend bg-pend-soft" />,
  damaged: <span className="size-3 rotate-45 bg-bad" />,
};

export function Kpi({ label, value, dot, sub, subTone, className, href, unit }: { label: string; value: ReactNode; dot?: ReactNode; sub?: ReactNode; subTone?: "ok" | "bad" | "mute"; className?: string; href?: string; unit?: string }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-white px-4 py-3.5 lg:px-5 lg:py-4", className)}>
      <div className="flex items-start gap-2">
        <p className="flex flex-1 items-center gap-2 text-[15px] text-mute lg:text-xs lg:font-semibold lg:tracking-wider lg:uppercase">
          {dot}
          {label}
        </p>
        {href && (
          <Link href={href} aria-label={`Open ${label}`} className="-mt-1 -mr-1 hidden size-8 place-items-center rounded-lg border border-line text-mute hover:bg-canvas hover:text-ink lg:grid">
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <p className="tabular font-display text-[34px] leading-tight font-bold">
        {value}
        {unit && <span className="ml-1.5 font-sans text-sm font-normal text-mute">{unit}</span>}
      </p>
      {sub && (
        <p className="mt-0.5 text-[13px]">
          <span className={cx("rounded-md px-1.5 py-0.5 font-semibold", subTone === "ok" ? "bg-ok-soft text-ok" : subTone === "bad" ? "bg-bad-soft text-bad-ink" : "bg-canvas text-mute")}>{sub}</span>
        </p>
      )}
    </div>
  );
}

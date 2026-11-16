"use client";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cx } from "./ui";

/** Client-side pagination. Changing `resetKey` (e.g. the active filters) jumps back to page 1. */
export function usePaged<T>(items: T[], resetKey: string, initialSize = 25) {
  const [st, setSt] = useState({ key: resetKey, page: 1 });
  const [size, setSize] = useState(initialSize);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = st.key === resetKey ? Math.min(st.page, pages) : 1;
  const start = (page - 1) * size;
  return {
    rows: items.slice(start, start + size),
    page,
    pages,
    size,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + size, items.length),
    setPage: (p: number) => setSt({ key: resetKey, page: p }),
    setSize: (n: number) => (setSize(n), setSt({ key: resetKey, page: 1 })),
  };
}
export type Paged = ReturnType<typeof usePaged>;

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, page - 1), hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function Pager({ pg, sizes = [10, 25, 50, 100], noun = "lights" }: { pg: Paged; sizes?: number[]; noun?: string }) {
  if (!pg.total) return null;
  const btn = "grid size-9 place-items-center rounded-lg border border-line bg-white text-sm hover:bg-canvas disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-sm text-mute">
      <label className="flex items-center gap-2">
        <span>Rows per page</span>
        <span className="relative">
          <select value={pg.size} onChange={(e) => pg.setSize(+e.target.value)} className="h-9 appearance-none rounded-lg border border-line bg-white pr-7 pl-2.5 font-semibold text-ink">
            {sizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2" />
        </span>
      </label>
      <span className="tabular flex-1">
        {pg.from}–{pg.to} of {pg.total} {noun}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={btn} onClick={() => pg.setPage(pg.page - 1)} disabled={pg.page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        {pageList(pg.page, pg.pages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="w-6 text-center">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === pg.page ? "page" : undefined}
              onClick={() => pg.setPage(p)}
              className={cx(btn, "tabular hidden sm:grid", p === pg.page && "border-navy-900 bg-navy-900 font-semibold text-white hover:bg-navy-800")}
            >
              {p}
            </button>
          ),
        )}
        <span className="tabular px-2 sm:hidden">
          {pg.page} / {pg.pages}
        </span>
        <button type="button" className={btn} onClick={() => pg.setPage(pg.page + 1)} disabled={pg.page >= pg.pages} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

/** Native <select> styled as a filter pill (FixTrack-style "All trades ▾"). */
export function FilterSelect({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <span className={cx("relative inline-flex", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-line bg-white pr-9 pl-3 text-[14px] font-medium text-ink hover:border-pend focus:border-navy-700 focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-mute" />
    </span>
  );
}

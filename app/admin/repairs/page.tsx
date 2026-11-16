"use client";
import { Filter, Search, Wrench } from "lucide-react";
import { FilterSelect, Pager, usePaged } from "@/components/pager";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { RepairCard } from "@/components/repair-card";
import { AppShell, usePortal } from "@/components/shell";
import { Empty, IconButton, TaskBar, cx } from "@/components/ui";
import { daysBetween } from "@/lib/format";
import type { Repair } from "@/lib/types";
import { STAGES } from "@/lib/view";

export default function Page() {
  return (
    <AppShell roles={["admin"]}>
      <Suspense>
        <Repairs />
      </Suspense>
    </AppShell>
  );
}

const DOT: Record<Repair["stage"], string> = {
  reported: "bg-bad text-white",
  notified: "bg-navy-900 text-white",
  photo: "bg-wait text-ink",
  repaired: "bg-ok-soft text-ok",
};

function Repairs() {
  const { data } = usePortal();
  const owner = (r: Repair) => data.users.find((u) => u.id === data.lights.find((l) => l.id === r.lightId)?.ownerId)?.name ?? "";
  const params = useSearchParams();
  const [stage, setStage] = useState<Repair["stage"]>((params.get("stage") as Repair["stage"]) || "reported");
  const [ward, setWard] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const query = q.trim().toUpperCase();
  const [filter, setFilter] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const inStage = (st: Repair["stage"]) =>
    data.repairs
      .filter((r) => r.stage === st && (!ward || r.ward === ward) && (st !== "repaired" || daysBetween(r.repairedAt!) <= 7))
      .filter((r) => !query || `${r.sno} ${r.complaint} ${owner(r)}`.toUpperCase().includes(query))
      .sort((a, b) => (st === "repaired" ? b.repairedAt!.localeCompare(a.repairedAt!) : a.reportedAt.localeCompare(b.reportedAt)));
  const list = inStage(stage);
  const pg = usePaged(list, `${stage}|${ward}|${query}`, 10);
  const expanded = openId && pg.rows.some((r) => r.id === openId) ? openId : pg.rows[0]?.id;
  const hint = STAGES.find((s) => s.key === stage)!.hint;

  return (
    <>
      <TaskBar
        title="Repairs"
        back="/admin"
        right={
          <IconButton label="Filter by ward" onClick={() => setFilter(!filter)} className={cx("size-12 rounded-2xl", (filter || !!ward) && "border-navy-900")}>
            <Filter size={22} />
          </IconButton>
        }
      />
      <div className="sticky top-16 z-20 border-b border-line bg-white lg:top-32">
        <div className={cx("gap-2 px-4 pt-1 pb-3 sm:flex lg:flex lg:px-8", filter ? "grid" : "hidden")}>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-navy-700 sm:w-72">
            <Search size={16} className="text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SNO, complaint or owner" aria-label="Search repairs" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none sm:text-[14px]" />
          </label>
          <FilterSelect label="Ward" value={ward ? String(ward) : "all"} onChange={(v) => setWard(v === "all" ? null : +v)}>
            <option value="all">All wards</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
              <option key={w} value={w}>
                Ward {w}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div role="tablist" className="mx-auto grid max-w-3xl grid-cols-4 lg:mx-0 lg:max-w-2xl lg:px-4">
          {STAGES.map((s) => {
            const n = inStage(s.key).length;
            const on = s.key === stage;
            return (
              <button key={s.key} role="tab" type="button" aria-selected={on} onClick={() => setStage(s.key)} className={cx("flex flex-col items-center gap-1.5 border-b-[3px] px-1 pt-2 pb-3", on ? "border-navy-900" : "border-transparent")}>
                <span className={cx("tabular grid size-9 place-items-center rounded-full text-[15px] font-bold", DOT[s.key])}>{n}</span>
                <span className={cx("text-center text-sm leading-tight", on ? "font-bold text-ink" : "text-mute")}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-4 py-4 lg:px-8 lg:py-6">
        <p className="mb-3 text-[15px] text-mute">{hint}</p>
        {list.length ? (
          <div className="grid items-start gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
            {pg.rows.map((r) => (
              <RepairCard key={r.id} data={data} r={r} canAct open={r.id === expanded} onToggle={() => setOpenId(r.id === expanded ? "none" : r.id)} />
            ))}
          </div>
        ) : (
          <Empty icon={<Wrench size={26} />} title="Nothing here">
            No repairs at this stage{ward ? ` in Ward ${ward}` : ""}.
          </Empty>
        )}
        {pg.total > 10 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <Pager pg={pg} sizes={[10, 20, 50]} noun="repairs" />
          </div>
        )}
      </div>
    </>
  );
}

"use client";
import { Download, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { day } from "@/lib/format";
import { normalizeSno, visibleLights } from "@/lib/portal";
import type { Light } from "@/lib/types";
import { shownStatus } from "@/lib/view";
import { FilterSelect, Pager, usePaged } from "./pager";
import { PageHeader } from "./screens";
import { usePortal } from "./shell";
import { Button, Empty, PhotoBox, Pill } from "./ui";
import { ExportSheet, LightRow } from "./widgets";

type St = "all" | "working" | "pending" | "damaged";
type Sort = "sno" | "newest" | "oldest" | "repairs";

const SORTS: Record<Sort, (a: Light, b: Light) => number> = {
  sno: (a, b) => a.ward - b.ward || a.sno.localeCompare(b.sno),
  newest: (a, b) => b.installedAt.localeCompare(a.installedAt),
  oldest: (a, b) => a.installedAt.localeCompare(b.installedAt),
  repairs: (a, b) => b.repairCount - a.repairCount || a.sno.localeCompare(b.sno),
};

export function LightsBrowser() {
  const { data, me } = usePortal();
  const params = useSearchParams();
  const router = useRouter();
  const [ward, setWard] = useState(params.get("ward") ?? (me.role === "ward" ? String(me.ward) : "all"));
  const [st, setSt] = useState<St>("all");
  const [sort, setSort] = useState<Sort>("sno");
  const [q, setQ] = useState("");
  const [exp, setExp] = useState(false);

  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? "";
  const all = visibleLights(data, me).filter((l) => l.status !== "returned");
  const query = normalizeSno(q);
  const list = all
    .filter((l) => ward === "all" || l.ward === +ward)
    .filter((l) => !query || l.sno.includes(query) || name(l.ownerId).toUpperCase().includes(query) || (l.place ?? "").toUpperCase().includes(query))
    .filter((l) => {
      if (st === "all") return true;
      const k = shownStatus(data, l).key;
      return st === "damaged" ? k === "damaged" || k === "awaiting" : k === st;
    })
    .sort(SORTS[sort]);
  const pg = usePaged(list, `${ward}|${st}|${sort}|${query}`, 25);
  const statuses: St[] = me.role === "admin" ? ["all", "working", "pending", "damaged"] : ["all", "working", "damaged"];

  return (
    <>
      <PageHeader
        title={me.role === "ward" ? `Ward ${me.ward} lights` : "Lights"}
        sub={`${all.length} lights${me.role === "coa" ? " · view only" : ""}`}
        right={
          <Button variant="outline" onClick={() => setExp(true)}>
            <Download size={18} /> Export
          </Button>
        }
      />
      <div className="space-y-3 px-4 py-4 lg:px-8">
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3.5 focus-within:border-navy-700 sm:h-10 sm:w-72">
            <Search size={18} className="text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SNO, owner or place" aria-label="Search lights" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none sm:text-[14px]" />
          </label>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            {me.role !== "ward" && (
              <FilterSelect label="Ward" value={ward} onChange={setWard}>
                <option value="all">All wards</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                  <option key={w} value={w}>
                    Ward {w}
                  </option>
                ))}
              </FilterSelect>
            )}
            <FilterSelect label="Status" value={st} onChange={(v) => setSt(v as St)}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Any status" : s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Sort" value={sort} onChange={(v) => setSort(v as Sort)}>
              <option value="sno">Sort: Ward & SNO</option>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="repairs">Sort: Most repairs</option>
            </FilterSelect>
          </div>
          <p className="text-sm text-mute sm:ml-auto">{list.length === all.length ? "Showing all" : `${list.length} match`}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="divide-y divide-line lg:hidden">
            {pg.rows.map((l) => (
              <LightRow key={l.id} data={data} light={l} sub={`Ward ${l.ward} · ${name(l.ownerId)} · ${l.repairCount ? `repaired ${l.repairCount}×` : day(l.installedAt)}`} />
            ))}
          </div>
          <table className="hidden w-full text-left text-[14px] lg:table">
            <thead className="border-b border-line bg-canvas/60 text-xs tracking-wider text-mute uppercase">
              <tr>
                {["Light", "Ward", "Owner", "Place", "Installed", "GPS", "Repairs", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pg.rows.map((l) => {
                const s = shownStatus(data, l);
                return (
                  <tr key={l.id} className="cursor-pointer hover:bg-canvas" onClick={() => router.push(`/light?sno=${l.sno}`)}>
                    <td className="px-4 py-2">
                      <Link href={`/light?sno=${l.sno}`} className="flex items-center gap-3 font-display font-bold">
                        <PhotoBox src={l.photo} alt="" className="size-9 rounded-lg" icon={16} />
                        {l.sno}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{l.ward}</td>
                    <td className="px-4 py-2">{name(l.ownerId)}</td>
                    <td className="max-w-48 truncate px-4 py-2 text-mute">{l.place}</td>
                    <td className="tabular px-4 py-2 text-mute">{day(l.installedAt)}</td>
                    <td className="tabular px-4 py-2 text-mute">±{l.accuracy} m</td>
                    <td className="tabular px-4 py-2">{l.repairCount}</td>
                    <td className="px-4 py-2">
                      <Pill tone={s.tone}>{s.label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!list.length && (
            <Empty icon={<SearchX size={26} />} title="No lights match">
              Try another SNO, ward or status.
            </Empty>
          )}
          <Pager pg={pg} />
        </div>
      </div>
      <ExportSheet open={exp} onClose={() => setExp(false)} data={data} me={me} initialWard={ward === "all" ? undefined : +ward} />
    </>
  );
}

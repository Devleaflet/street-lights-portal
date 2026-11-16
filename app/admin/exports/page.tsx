"use client";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/screens";
import { AppShell, usePortal } from "@/components/shell";
import { Button } from "@/components/ui";
import { ExportSheet } from "@/components/widgets";
import { wardStats } from "@/lib/portal";

export default function Page() {
  return (
    <AppShell roles={["admin"]}>
      <Exports />
    </AppShell>
  );
}

const WHAT = [
  { t: "By SNO or by ward", d: "Each light's details, repair count and condition." },
  { t: "With photos", d: "An Excel table with Photo, SNO, Installed Date and Ward Number." },
  { t: "Admin extras", d: "Every admin file also has a ward summary, a repairs sheet and a users sheet." },
];

function Exports() {
  const { data, me } = usePortal();
  const [open, setOpen] = useState(false);
  const stats = wardStats(data, me);
  return (
    <>
      <PageHeader title="Exports" sub="Excel files, built on this device" />
      <div className="space-y-5 px-4 py-5 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {WHAT.map((w) => (
            <div key={w.t} className="rounded-2xl border border-line bg-white p-4">
              <FileSpreadsheet className="text-ok" />
              <p className="mt-2 font-semibold">{w.t}</p>
              <p className="text-sm text-mute">{w.d}</p>
            </div>
          ))}
        </div>
        <Button variant="dark" size="lg" className="w-full lg:w-auto" onClick={() => setOpen(true)}>
          <Download size={22} /> Export to Excel
        </Button>
        <p className="text-sm text-mute">Photos are shrunk before saving, but large photo exports still make big files. Export one ward at a time if the file gets too large.</p>
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Ward summary preview</h2>
          <table className="tabular w-full text-left text-[15px]">
            <thead className="border-y border-line text-xs tracking-wider text-mute uppercase">
              <tr>
                {["Ward", "Total", "Working", "Damaged", "Pending"].map((h) => (
                  <th key={h} className="px-4 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats.map((w) => (
                <tr key={w.ward}>
                  <td className="px-4 py-2.5 font-semibold">Ward {w.ward}</td>
                  <td className="px-4 py-2.5">{w.total}</td>
                  <td className="px-4 py-2.5">{w.working}</td>
                  <td className="px-4 py-2.5">{w.damaged}</td>
                  <td className="px-4 py-2.5">{w.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <ExportSheet open={open} onClose={() => setOpen(false)} data={data} me={me} />
    </>
  );
}

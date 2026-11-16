"use client";
import { ChevronDown, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CameraSheet } from "./camera";
import { estimate, downloadExcel } from "@/lib/export";
import { day } from "@/lib/format";
import { exportRows, normalizeSno, WARDS } from "@/lib/portal";
import { toast } from "@/lib/store";
import type { ExportScope, Light, State, User } from "@/lib/types";
import { shownStatus } from "@/lib/view";
import { Button, Chip, PhotoBox, Pill, Sheet, cx, inputCls } from "./ui";

export function LightRow({ data, light, sub, pill, icon, href }: { data: State; light: Light; sub: ReactNode; pill?: ReactNode; icon?: ReactNode; href?: string }) {
  const st = shownStatus(data, light);
  return (
    <Link href={href ?? `/light?sno=${light.sno}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-canvas">
      {icon ?? <PhotoBox src={light.photo} alt={`Photo of ${light.sno}`} className="size-14 shrink-0 rounded-xl" />}
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold">{light.sno}</p>
        <p className="truncate text-[15px] text-mute">{sub}</p>
      </div>
      {pill ?? <Pill tone={st.tone}>{st.label}</Pill>}
    </Link>
  );
}

/** Trigger that opens the live camera (no gallery upload) and hands back a shrunk JPEG data URL. */
export function PhotoInput({ onPhoto, children, className, title, caption }: { onPhoto: (dataUrl: string) => void; children: ReactNode; className?: string; title?: string; caption?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "block text-left"}>
        {children}
      </button>
      <CameraSheet open={open} onClose={() => setOpen(false)} onPhoto={onPhoto} title={title} caption={caption} />
    </>
  );
}

type Mode = "all" | "ward" | "sno";

/** "Export to Excel" bottom sheet — scoped to what the signed-in role may see. */
export function ExportSheet({ open, onClose, data, me, initialWard }: { open: boolean; onClose: () => void; data: State; me: User; initialWard?: number }) {
  const isWard = me.role === "ward";
  const [mode, setMode] = useState<Mode>(isWard ? "ward" : "ward");
  const [ward, setWard] = useState(initialWard ?? me.ward ?? 4);
  const [sno, setSno] = useState("");
  const [photos, setPhotos] = useState(true);
  const [busy, setBusy] = useState(false);

  const effWard = isWard ? me.ward! : ward;
  const scope: ExportScope = mode === "all" ? { type: "all" } : mode === "ward" ? { type: "ward", ward: effWard } : { type: "sno", sno };
  let rows: ReturnType<typeof exportRows> = [];
  try {
    rows = mode === "sno" && !sno.trim() ? [] : exportRows(data, me, scope);
  } catch {
    rows = [];
  }
  const perWard = (w: number) => exportRows(data, me, { type: "ward", ward: w }).length;
  const allCount = isWard ? 0 : exportRows(data, me, { type: "all" }).length;
  const today = day(new Date().toISOString()).replace(" ", "-");
  const filename =
    mode === "all" ? `All-wards-lights-${today}.xlsx` : mode === "ward" ? `Ward-${effWard}-lights-${today}.xlsx` : `${normalizeSno(sno) || "SNO"}-${today}.xlsx`;

  const modes: { v: Mode; label: string }[] = isWard
    ? [
        { v: "ward", label: `Ward ${me.ward}` },
        { v: "sno", label: "By SNO" },
      ]
    : [
        { v: "all", label: "All wards" },
        { v: "ward", label: "One ward" },
        { v: "sno", label: "By SNO" },
      ];

  async function go() {
    setBusy(true);
    try {
      await downloadExcel({ rows, photos, filename, state: data, me });
      toast(`${filename} downloaded`);
      onClose();
    } catch (e) {
      toast((e as Error).message || "Export failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Export to Excel">
      <p className="mb-2 text-[15px] font-semibold text-mute">What to export</p>
      <div className={cx("mb-3 grid gap-2", modes.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {modes.map((m) => (
          <Chip key={m.v} active={mode === m.v} onClick={() => setMode(m.v)} className="h-14 rounded-2xl text-base">
            {m.label}
          </Chip>
        ))}
      </div>

      {mode === "ward" && !isWard && (
        <label className="relative mb-3 flex h-14 items-center justify-between rounded-2xl border border-line px-4">
          <span className="text-base">Ward</span>
          <span className="pointer-events-none flex items-center gap-1 text-lg font-bold">
            Ward {ward} · {perWard(ward)} lights <ChevronDown size={18} />
          </span>
          <select aria-label="Ward" value={ward} onChange={(e) => setWard(+e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
            {WARDS.map((w) => (
              <option key={w} value={w}>
                Ward {w} · {perWard(w)} lights
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === "sno" && (
        <div className="mb-3">
          <input value={sno} onChange={(e) => setSno(e.target.value)} placeholder="SNO, e.g. SL-04-0217" aria-label="SNO to export" autoCapitalize="characters" className={inputCls} />
          {sno.trim() && !rows.length && <p className="mt-1.5 text-sm text-bad-ink">No light {normalizeSno(sno)} in what you can see.</p>}
        </div>
      )}

      <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-canvas px-4 py-3.5">
        <span className="flex-1">
          <span className="block text-lg font-semibold">Include photos</span>
          <span className="block text-sm text-mute">Columns: Photo, SNO, Installed date, Ward</span>
        </span>
        <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} className="size-7 accent-navy-900" />
      </label>

      <div className="mb-1 flex items-center gap-2 text-[15px]">
        <FileText size={20} className="text-mute" />
        <span className="min-w-0 flex-1 truncate">{filename}</span>
        <span className="font-bold text-ok">{estimate(rows.length, photos)}</span>
      </div>
      <p className="mb-4 text-sm text-mute">
        {photos && !isWard
          ? `All 9 wards with photos would be about ${Math.round((allCount * 60) / 1000)} MB. One ward at a time keeps files small enough to email.`
          : `${rows.length} light${rows.length === 1 ? "" : "s"} with details, repair count and condition.`}
        {me.role === "admin" && " The admin file also has a ward summary, a repairs sheet and a users sheet."}
      </p>

      <Button variant="dark" size="lg" className="w-full" disabled={!rows.length || busy} onClick={go}>
        <Download size={22} /> {busy ? "Preparing file…" : "Download Excel"}
      </Button>
    </Sheet>
  );
}

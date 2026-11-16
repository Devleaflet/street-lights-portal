"use client";
// Excel exports built in the browser with ExcelJS (loaded only when someone downloads).
import { day, date } from "./format";
import { wardStats } from "./portal";
import type { ExportRow, State, User } from "./types";
import { STAGES } from "./view";

export const PHOTO_KB = 60;

export function estimate(rows: number, photos: boolean) {
  const kb = photos ? rows * PHOTO_KB : 8 + rows * 0.15;
  return kb >= 1000 ? `≈ ${Math.round(kb / 1000)} MB` : `≈ ${Math.max(1, Math.round(kb))} KB`;
}

function placeholderPng(): string {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 120;
  const g = c.getContext("2d")!;
  g.fillStyle = "#dfe4ec";
  g.fillRect(0, 0, 160, 120);
  g.strokeStyle = "#64748b";
  g.lineWidth = 6;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(62, 100);
  g.lineTo(62, 46);
  g.quadraticCurveTo(62, 26, 82, 26);
  g.lineTo(100, 26);
  g.moveTo(100, 26);
  g.lineTo(100, 36);
  g.stroke();
  return c.toDataURL("image/png");
}

export async function downloadExcel(opts: { rows: ExportRow[]; photos: boolean; filename: string; state: State; me: User }) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Street Light Portal";
  const head = (ws: import("exceljs").Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111A2E" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  const ws = wb.addWorksheet("Lights");
  if (opts.photos) {
    ws.columns = [
      { header: "Photo", key: "photo", width: 18 },
      { header: "SNO", key: "sno", width: 16 },
      { header: "Installed Date", key: "installed", width: 16 },
      { header: "Ward Number", key: "ward", width: 14 },
    ];
    head(ws);
    let placeholderId: number | undefined;
    opts.rows.forEach((r, i) => {
      const row = ws.addRow({ sno: r.sno, installed: date(r.installedAt), ward: r.ward });
      row.height = 64;
      row.alignment = { vertical: "middle" };
      let imageId: number;
      if (r.photo) {
        imageId = wb.addImage({ base64: r.photo, extension: r.photo.startsWith("data:image/png") ? "png" : "jpeg" });
      } else {
        placeholderId ??= wb.addImage({ base64: placeholderPng(), extension: "png" });
        imageId = placeholderId;
      }
      ws.addImage(imageId, { tl: { col: 0.1, row: i + 1.08 }, ext: { width: 112, height: 80 } });
    });
  } else {
    ws.columns = [
      { header: "SNO", key: "sno", width: 16 },
      { header: "Ward", key: "ward", width: 8 },
      { header: "Latitude", key: "lat", width: 12 },
      { header: "Longitude", key: "lng", width: 12 },
      { header: "Installed date", key: "installed", width: 15 },
      { header: "Owner", key: "owner", width: 14 },
      { header: "Condition", key: "condition", width: 26 },
      { header: "Repair count", key: "repairs", width: 13 },
    ];
    head(ws);
    for (const r of opts.rows)
      ws.addRow({ sno: r.sno, ward: r.ward, lat: r.lat, lng: r.lng, installed: date(r.installedAt), owner: r.owner, condition: r.condition, repairs: r.repairCount });
  }

  if (opts.me.role === "admin") {
    const s = opts.state;
    const sum = wb.addWorksheet("Ward summary");
    sum.columns = [
      { header: "Ward", key: "ward", width: 8 },
      { header: "Total lights", key: "total", width: 13 },
      { header: "Working", key: "working", width: 10 },
      { header: "Damaged", key: "damaged", width: 10 },
      { header: "Pending approval", key: "pending", width: 17 },
      { header: "Repairs done", key: "repairs", width: 13 },
    ];
    head(sum);
    for (const w of wardStats(s, opts.me))
      sum.addRow({ ...w, repairs: s.repairs.filter((r) => r.ward === w.ward && r.stage === "repaired").length });

    const rep = wb.addWorksheet("Repairs");
    rep.columns = [
      { header: "SNO", key: "sno", width: 16 },
      { header: "Ward", key: "ward", width: 8 },
      { header: "Complaint", key: "complaint", width: 32 },
      { header: "Reported", key: "reported", width: 12 },
      { header: "Reported by", key: "by", width: 16 },
      { header: "Stage", key: "stage", width: 18 },
      { header: "Repaired", key: "repaired", width: 12 },
    ];
    head(rep);
    const name = (id: string) => s.users.find((u) => u.id === id)?.name ?? "";
    for (const r of [...s.repairs].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)))
      rep.addRow({
        sno: r.sno,
        ward: r.ward,
        complaint: r.complaint,
        reported: day(r.reportedAt),
        by: name(r.reportedBy),
        stage: STAGES.find((x) => x.key === r.stage)!.short,
        repaired: r.repairedAt ? day(r.repairedAt) : "",
      });

    const us = wb.addWorksheet("Users");
    us.columns = [
      { header: "Name", key: "name", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Role", key: "role", width: 14 },
      { header: "Ward", key: "ward", width: 8 },
      { header: "Status", key: "status", width: 10 },
      { header: "Lights owned", key: "lights", width: 13 },
    ];
    head(us);
    for (const u of s.users)
      us.addRow({ name: u.name, email: u.email, role: u.role, ward: u.ward ?? "", status: u.status, lights: s.lights.filter((l) => l.ownerId === u.id).length || "" });
  }

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: opts.filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

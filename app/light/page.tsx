"use client";
import { MapPin, SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CityMap } from "@/components/city-map";
import { LightAction } from "@/components/light-action";
import { AppShell, usePortal } from "@/components/shell";
import { Timeline } from "@/components/timeline";
import { ActionBar, Alert, Empty, IconButton, PhotoBox, Sheet, TaskBar, cx } from "@/components/ui";
import { date, daysBetween, month, ordinal } from "@/lib/format";
import { lightHistory, normalizeSno } from "@/lib/portal";
import { shownStatus } from "@/lib/view";

export default function Page() {
  return (
    <AppShell roles={["admin", "installer", "ward", "coa"]} task>
      <Suspense>
        <History />
      </Suspense>
    </AppShell>
  );
}

const BADGE = { ok: "bg-ok-soft text-ok", pend: "bg-pend-soft text-pend-ink", bad: "bg-[#fdba8c] text-navy-900" } as const;

function History() {
  const { data, me } = usePortal();
  const sno = normalizeSno(useSearchParams().get("sno") ?? "");
  const [map, setMap] = useState(false);
  const h = sno ? lightHistory(data, me, sno) : undefined;

  if (!h)
    return (
      <>
        <TaskBar title="Light history" />
        <Empty icon={<SearchX size={26} />} title={sno ? `No light ${sno}` : "Type an SNO to look up"}>
          {me.role === "ward" ? `Ward officers can look up lights in Ward ${me.ward} only.` : me.role === "installer" ? "Installers can look up their own lights only." : "Check the serial number and try again."}
        </Empty>
      </>
    );

  const { light, repairs } = h;
  const st = shownStatus(data, light);
  const done = repairs.filter((r) => r.stage === "repaired");
  const avg = done.length ? done.reduce((a, r) => a + Math.max(1, daysBetween(r.reportedAt, r.repairedAt!)), 0) / done.length : null;
  const last = done[0]?.repairedAt;
  const owner = data.users.find((u) => u.id === light.ownerId)?.name ?? "—";
  const year = new Date().getFullYear();
  const faults = repairs.filter((r) => new Date(r.reportedAt).getFullYear() === year).length;
  const lastPhoto = repairs.find((r) => r.afterPhotoAt);
  const tone = st.tone === "ok" ? "ok" : st.tone === "pend" ? "pend" : "bad";
  const action = LightAction({ data, me, light }); // plain function call: no hooks inside, lets us skip the empty bar
  const stats = [
    { v: light.repairCount, l: "Repairs", accent: true },
    { v: avg === null ? "—" : +avg.toFixed(1), l: "Avg days to fix" },
    { v: daysBetween(last ?? light.installedAt), l: last ? "Days since last" : "Days in service" },
  ];

  return (
    <div className="flex min-h-dvh flex-col lg:min-h-[calc(100dvh-4rem)]">
      <TaskBar
        title="Light history"
        right={
          <IconButton label="Show on map" onClick={() => setMap(true)} className="size-12 rounded-2xl">
            <MapPin size={22} />
          </IconButton>
        }
      />
      <div className="grid flex-1 content-start gap-4 px-4 py-4 lg:grid-cols-2 lg:items-start lg:gap-5 lg:px-8 lg:py-6">
        <div className="space-y-4">
        <section className="rounded-3xl bg-navy-900 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-[32px] leading-tight font-bold">{light.sno}</h2>
            <span className={cx("rounded-lg px-3 py-1 text-[15px] font-bold", BADGE[tone])}>{st.label}</span>
          </div>
          <p className="mt-1 text-white/75">
            Ward {light.ward} · installed {date(light.installedAt)} · {owner}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.l} className="rounded-2xl bg-navy-800 px-4 py-3">
                <p className={cx("tabular font-display text-3xl font-bold", s.accent && "text-brand")}>{s.v}</p>
                <p className="text-sm text-white/75">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <figure>
            <PhotoBox src={light.photo} alt={`Install photo of ${light.sno}`} className="aspect-[4/2.6] w-full rounded-2xl" icon={30} />
            <figcaption className="mt-1.5 text-[15px] text-mute">Install photo · {month(light.installedAt)}</figcaption>
          </figure>
          <figure>
            <PhotoBox src={lastPhoto?.afterPhoto} alt={`Latest after-photo of ${light.sno}`} className="aspect-[4/2.6] w-full rounded-2xl" icon={30} />
            <figcaption className="mt-1.5 text-[15px] text-mute">{lastPhoto ? `Last after-photo · ${month(lastPhoto.afterPhotoAt!)}` : "No after-photo yet"}</figcaption>
          </figure>
        </div>

        {light.status === "returned" && <Alert tone="bad">Sent back by admin: {light.returnReason}</Alert>}
        </div>

        <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-xl font-semibold">Timeline</h3>
          <Timeline data={data} light={light} repairs={repairs} />
        </section>

        {faults >= 3 && <Alert>{ordinal(faults)} fault this year. Consider replacing the fitting instead of another repair.</Alert>}
        </div>
      </div>

      {action && <ActionBar>{action}</ActionBar>}

      <Sheet open={map} onClose={() => setMap(false)} title={`${light.sno} on the map`}>
        <CityMap data={data} lights={[light]} ward={light.ward} focus={light} zoomFocus popover={false} className="h-72 rounded-2xl" />
        <p className="tabular mt-3 text-[15px] text-mute">
          {light.lat.toFixed(5)}, {light.lng.toFixed(5)} · GPS ±{light.accuracy} m{light.place ? ` · ${light.place}` : ""}
        </p>
      </Sheet>
    </div>
  );
}

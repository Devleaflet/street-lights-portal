"use client";
import { LocateFixed, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { captureFix } from "@/components/add-light-parts";
import { CityMap } from "@/components/city-map";
import { AppShell, usePortal } from "@/components/shell";
import { ActionBar, Alert, Button, Chip, PhotoBox, Pill, TaskBar, cx, inputCls } from "@/components/ui";
import { COMPLAINTS, findLight, metresBetween, openRepairFor, reportDamage, visibleLights, visibleRepairs } from "@/lib/portal";
import { act, toast } from "@/lib/store";
import { shownStatus } from "@/lib/view";

export default function Page() {
  return (
    <AppShell roles={["ward"]} task>
      <Suspense>
        <Report />
      </Suspense>
    </AppShell>
  );
}

function Report() {
  const { data, me } = usePortal();
  const router = useRouter();
  const lights = visibleLights(data, me);
  const initialSno = useSearchParams().get("sno") ?? "";
  const [selId, setSelId] = useState<string | null>(() => findLight(data, me, initialSno)?.id ?? null);
  const [q, setQ] = useState("");
  const [what, setWhat] = useState(COMPLAINTS[0]);
  const [note, setNote] = useState("");
  const sel = lights.find((l) => l.id === selId);
  const open = sel ? openRepairFor(data, sel.id) : undefined;
  const otherOpen = visibleRepairs(data, me).find((r) => r.stage !== "repaired" && r.lightId !== selId);
  const mine = visibleRepairs(data, me).filter((r) => r.reportedBy === me.id && r.stage !== "repaired").length;
  const complaint = what === "Other" ? note.trim() : what;

  const lookup = () => {
    const l = findLight(data, me, q);
    if (l) return setSelId(l.id);
    toast(`${q.trim().toUpperCase()} isn't in Ward ${me.ward}`, "error");
  };
  const locate = async () => {
    const f = await captureFix();
    const near = lights.map((l) => ({ l, d: metresBetween(f.lat, f.lng, l.lat, l.lng) })).sort((a, b) => a.d - b.d)[0];
    if (!near) return;
    setSelId(near.l.id);
    toast(near.d < 60 ? `Nearest light: ${near.l.sno}` : `Demo: you're not in Ward ${me.ward}, so the closest light to you was picked (${near.l.sno})`);
  };
  const send = () => {
    if (!sel) return;
    if (act((s, m, now) => reportDamage(s, m, { sno: sel.sno, complaint, note: what === "Other" ? undefined : note }, now), "Report sent to admin. You'll get an update when it's fixed.")) router.push("/ward");
  };

  return (
    <div className="flex min-h-dvh flex-col lg:min-h-[calc(100dvh-4rem)]">
      <TaskBar
        title="Report damage"
        sub={`Ward ${me.ward} officer · your ward only`}
        back="/ward"
        right={
          <Link href="/ward#reports" className="px-2 text-[17px] font-semibold text-link underline">
            My reports ({mine})
          </Link>
        }
      />
      <div className="flex-1 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:px-8 lg:py-6">
      <div className="relative">
        <CityMap data={data} lights={lights} ward={me.ward} selected={selId} onSelect={(l) => l && setSelId(l.id)} popover={false} wardLabels={false} className="h-[38dvh] min-h-64 lg:h-[calc(100dvh-14rem)] lg:rounded-2xl lg:border lg:border-line" />
        <div className="absolute inset-x-4 bottom-4 flex gap-3">
          <form className="flex h-14 flex-1 items-center gap-2 rounded-2xl bg-white px-4 shadow-md" onSubmit={(e) => (e.preventDefault(), lookup())}>
            <Search size={20} className="text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or type SNO" aria-label="Type SNO" autoCapitalize="characters" enterKeyHint="search" className="h-full flex-1 bg-transparent text-lg outline-none focus-visible:outline-none" />
          </form>
          <button type="button" onClick={locate} aria-label="Use my location" className="grid size-14 place-items-center rounded-2xl bg-white shadow-md">
            <LocateFixed size={24} />
          </button>
        </div>
      </div>

      <div className="relative z-10 -mt-1 space-y-4 rounded-t-3xl bg-white px-4 pt-5 pb-4 lg:mt-0 lg:rounded-2xl lg:border lg:border-line lg:p-5">
        {sel ? (
          <div className="flex items-center gap-4">
            <PhotoBox src={sel.photo} alt={`Photo of ${sel.sno}`} className="size-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-bold">{sel.sno}</p>
              <p className="truncate text-[15px] text-mute">
                {sel.place ?? `Ward ${sel.ward}`} · {sel.repairCount ? `repaired ${sel.repairCount}×` : "never repaired"}
              </p>
            </div>
            <Pill tone={shownStatus(data, sel).tone}>{shownStatus(data, sel).label}</Pill>
          </div>
        ) : (
          <p className="rounded-2xl bg-canvas px-4 py-4 text-center text-mute">Tap a pin on the map, use your location, or type the SNO.</p>
        )}

        <fieldset disabled={!sel || !!open}>
          <legend className="mb-2 text-lg font-semibold">What&apos;s wrong?</legend>
          <div className="flex flex-wrap gap-2">
            {COMPLAINTS.map((c) => (
              <Chip key={c} active={what === c} onClick={() => setWhat(c)} className="h-12 text-[17px] disabled:opacity-50">
                {c}
              </Chip>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-lg font-semibold">
              Note <span className="text-[15px] font-normal text-mute">{what === "Other" ? "(say what's wrong)" : "(optional)"}</span>
            </span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. dark since Saturday, near the temple gate" className={cx(inputCls, "h-auto py-3")} />
          </label>
        </fieldset>

        {open ? (
          <Alert tone="bad">
            <b>{sel!.sno}</b> is already reported. You&apos;ll get an update when it&apos;s fixed.
          </Alert>
        ) : (
          otherOpen && (
            <Alert tone="bad">
              Tapped the orange pin? <b>{otherOpen.sno}</b> is already reported. You&apos;ll get an update when it&apos;s fixed.
            </Alert>
          )
        )}
      </div>
      </div>
      <ActionBar>
        <Button variant="danger" size="lg" disabled={!sel || !!open || !complaint} onClick={send}>
          Send report to admin
        </Button>
      </ActionBar>
    </div>
  );
}


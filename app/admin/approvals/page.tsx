"use client";
import { Check, CircleCheck, ListChecks, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApproveCard } from "@/components/approve-card";
import { AppShell, usePortal } from "@/components/shell";
import { ActionBar, Button, Chip, Empty, LinkButton, Panel, PhotoBox, Pill, Sheet, TaskBar, cx, inputCls } from "@/components/ui";
import { gpsQuality, plural } from "@/lib/format";
import { approveLight, sendBackLight } from "@/lib/portal";
import { act } from "@/lib/store";

const REASONS = ["Photo is blurry", "GPS looks wrong", "Wrong ward", "Duplicate light", "Wrong SNO"];

export default function Page() {
  return (
    <AppShell roles={["admin"]} task>
      <Suspense>
        <Approvals />
      </Suspense>
    </AppShell>
  );
}

function Approvals() {
  const { data } = usePortal();
  const params = useSearchParams();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [first, setFirst] = useState(params.get("id"));
  const [done, setDone] = useState(0);
  const [many, setMany] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [back, setBack] = useState(false);
  const [reason, setReason] = useState("");

  const pending = data.lights.filter((l) => l.status === "pending").sort((a, b) => a.installedAt.localeCompare(b.installedAt));
  const queue = [
    ...pending.filter((l) => l.id === first),
    ...pending.filter((l) => l.id !== first && !skipped.includes(l.id)),
    ...skipped.map((id) => pending.find((l) => l.id === id && l.id !== first)!).filter(Boolean),
  ];
  const cur = queue[0];
  const signups = data.users.filter((u) => u.status === "pending").length;
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? "";

  const next = () => setFirst(null);
  const approve = (id: string) => {
    if (act((s, me, now) => approveLight(s, me, id, now), "Approved · installer notified")) {
      setDone((d) => d + 1);
      next();
    }
  };
  const skip = (id: string) => {
    setSkipped((s) => [...s.filter((x) => x !== id), id]);
    next();
  };
  const sendBack = () => {
    if (cur && act((s, me, now) => sendBackLight(s, me, cur.id, reason, now), "Sent back to the installer")) {
      setBack(false);
      setReason("");
      setDone((d) => d + 1);
      next();
    }
  };
  const approveMany = () => {
    const n = picked.length;
    if (act((s, me, now) => picked.reduce((acc, id) => approveLight(acc, me, id, now), s), `${plural(n, "light")} approved`)) {
      setDone((d) => d + n);
      setPicked([]);
      setMany(false);
    }
  };

  const total = done + pending.length;
  return (
    <div className="flex min-h-dvh flex-col lg:min-h-[calc(100dvh-4rem)]">
      <TaskBar
        title="Approve lights"
        sub={pending.length ? `1 of ${pending.length} waiting` : "Nothing waiting"}
        back="/admin"
        right={
          pending.length > 0 && (
            <Button variant="outline" onClick={() => (setMany(!many), setPicked([]))}>
              {many ? "One by one" : "Select many"}
            </Button>
          )
        }
      />
      <div className="h-1.5 bg-line" aria-hidden>
        <div className="h-full bg-ok transition-[width] duration-300" style={{ width: `${total ? ((done + (pending.length ? 1 : 0)) / total) * 100 : 100}%` }} />
      </div>

      <div className="flex-1 px-4 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5 lg:px-8 lg:py-6">
        <div className="min-w-0">
        {signups > 0 && (
          <Link href="/admin/users" className="mb-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[15px] ring-1 ring-line hover:bg-canvas">
            <UserPlus size={18} className="text-mute" />
            <span className="flex-1">{plural(signups, "installer sign-up")} to approve</span>
            <span className="font-semibold text-link underline">Review</span>
          </Link>
        )}
        {!cur ? (
          <Empty icon={<CircleCheck size={28} />} title="All caught up">
            <p>No lights are waiting for approval.</p>
            <LinkButton href="/admin" variant="outline" className="mt-4">
              Back to overview
            </LinkButton>
          </Empty>
        ) : many ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {pending.map((l) => {
              const on = picked.includes(l.id);
              const q = gpsQuality(l.accuracy);
              return (
                <li key={l.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-canvas">
                    <input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== l.id) : [...picked, l.id])} className="size-6 accent-ok" />
                    <PhotoBox src={l.photo} alt={`Photo of ${l.sno}`} className="size-12 shrink-0 rounded-xl" icon={18} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display font-bold">{l.sno}</span>
                      <span className={cx("block truncate text-sm", q.tone === "bad" ? "font-medium text-brand-ink" : "text-mute")}>
                        Ward {l.ward} · {name(l.ownerId)} · GPS ±{l.accuracy} m{q.tone === "bad" ? " — check location" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <ApproveCard key={cur.id} data={data} light={cur} onApprove={() => approve(cur.id)} onSkip={() => skip(cur.id)} />
            <p className="mt-4 text-center text-[15px] text-mute">Swipe right to approve · left to skip</p>
          </>
        )}
        </div>
        {pending.length > 0 && !many && (
          <Panel title={`Queue · ${pending.length}`} icon={<ListChecks />} className="hidden overflow-hidden lg:flex" bodyClassName="max-h-[calc(100dvh-14rem)] overflow-y-auto">
            <ul className="divide-y divide-line">
              {queue.map((l) => {
                const q = gpsQuality(l.accuracy);
                const on = l.id === cur?.id;
                return (
                  <li key={l.id}>
                    <button type="button" onClick={() => setFirst(l.id)} aria-current={on} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left", on ? "bg-brand-wash" : "hover:bg-canvas")}>
                      <PhotoBox src={l.photo} alt="" className="size-11 shrink-0 rounded-lg" icon={16} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-bold">{l.sno}</span>
                        <span className={cx("block truncate text-[13px]", q.tone === "bad" ? "font-medium text-brand-ink" : "text-mute")}>
                          Ward {l.ward} · {name(l.ownerId)} · ±{l.accuracy} m
                        </span>
                      </span>
                      {on && <Pill tone="brand">Viewing</Pill>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>

      {cur && (
        <ActionBar>
            {many ? (
              <>
                <Button variant="outline" size="lg" onClick={() => setPicked(picked.length === pending.length ? [] : pending.map((l) => l.id))}>
                  {picked.length === pending.length ? "Clear" : "Select all"}
                </Button>
                <Button variant="ok" size="lg" disabled={!picked.length} onClick={approveMany}>
                  <Check size={22} /> Approve {picked.length || ""}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="lg" className="text-bad-ink" onClick={() => setBack(true)}>
                  <X size={22} /> Send back
                </Button>
                <Button variant="ok" size="lg" onClick={() => approve(cur.id)}>
                  <Check size={22} /> Approve
                </Button>
              </>
            )}
        </ActionBar>
      )}

      <Sheet open={back} onClose={() => setBack(false)} title={`Send back ${cur?.sno ?? ""}`}>
        <p className="mb-3 text-[15px] text-mute">The installer gets a notification with your reason, then fixes and resubmits.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Chip key={r} active={reason === r} onClick={() => setReason(r)}>
              {r}
            </Chip>
          ))}
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Or write a reason" aria-label="Reason" className={cx(inputCls, "h-auto py-3")} />
        <Button variant="danger" size="lg" className="mt-4 w-full" onClick={sendBack}>
          Send back to installer
        </Button>
      </Sheet>
    </div>
  );
}

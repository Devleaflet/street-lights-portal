"use client";
import { BellOff, Camera, CircleCheck, MessageCircle, TriangleAlert, Undo2, UserPlus, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, usePortal } from "@/components/shell";
import { Empty, LampIcon, TaskBar, cx } from "@/components/ui";
import { daysBetween, stamp } from "@/lib/format";
import { markAllRead, markRead } from "@/lib/portal";
import { act } from "@/lib/store";
import type { Notification } from "@/lib/types";

export default function Page() {
  return (
    <AppShell roles={["admin", "installer", "ward", "coa"]} task>
      <Notifications />
    </AppShell>
  );
}

const ICON: Record<Notification["icon"], { el: React.ReactNode; cls: string }> = {
  alert: { el: <TriangleAlert size={24} />, cls: "bg-bad-soft text-bad-ink" },
  lamp: { el: <LampIcon className="size-6" />, cls: "bg-pend-soft text-navy-900" },
  camera: { el: <Camera size={24} />, cls: "bg-wait-soft text-wait-ink" },
  user: { el: <UserPlus size={24} />, cls: "bg-pend-soft text-navy-900" },
  check: { el: <CircleCheck size={24} />, cls: "bg-ok-soft text-ok" },
  message: { el: <MessageCircle size={24} />, cls: "bg-pend-soft text-navy-900" },
  wrench: { el: <Wrench size={24} />, cls: "bg-brand-soft text-brand-ink" },
  undo: { el: <Undo2 size={24} />, cls: "bg-bad-soft text-bad-ink" },
};

function Group({ title, items, onOpen }: { title: string; items: Notification[]; onOpen: (n: Notification) => void }) {
return     items.length ? (
    <section>
      <h2 className="px-5 pt-5 pb-2 text-sm font-bold tracking-wider text-mute">{title}</h2>
      <ul>
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => onOpen(n)} className={cx("flex w-full items-start gap-4 px-5 py-3.5 text-left transition-colors", n.read ? "hover:bg-canvas" : "bg-brand-wash hover:bg-brand-soft/60")}>
              <span className={cx("grid size-14 shrink-0 place-items-center rounded-2xl", ICON[n.icon].cls)}>{ICON[n.icon].el}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] leading-snug font-semibold">{n.title}</span>
                <span className="block text-[15px] text-mute">{n.body}</span>
                <span className="block text-[15px] text-mute">{stamp(n.at)}</span>
              </span>
              {!n.read && <span className="mt-2 size-3 shrink-0 rounded-full bg-bad" aria-label="Unread" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  ) : null;
}

type F = "all" | "approval" | "repair" | "message";

function Notifications() {
  const { data, me, unread } = usePortal();
  const router = useRouter();
  const [f, setF] = useState<F>("all");
  const mine = data.notifications
    .filter((n) => n.to === me.id && (f === "all" || n.kind === f || (f === "approval" && n.kind === "user")))
    .sort((a, b) => b.at.localeCompare(a.at));
  const today = mine.filter((n) => daysBetween(n.at) <= 0);
  const earlier = mine.filter((n) => daysBetween(n.at) > 0);

  const open = (n: Notification) => {
    if (!n.read) act((s) => markRead(s, n.id));
    if (n.href) router.push(n.href);
  };

  const chips: { v: F; label: string }[] = [
    { v: "all", label: unread ? `All · ${unread}` : "All" },
    { v: "approval", label: "Approvals" },
    { v: "repair", label: "Repairs" },
    { v: "message", label: "Messages" },
  ];


  return (
    <div className="min-h-dvh bg-white lg:min-h-[calc(100dvh-4rem)]">
      <TaskBar
        title="Notifications"
        close
        right={
          unread > 0 && (
            <button type="button" onClick={() => act((s, m) => markAllRead(s, m), "All marked read")} className="h-11 px-2 text-[17px] font-semibold text-link">
              Mark all read
            </button>
          )
        }
      />
      <div className="lg:px-4">
        <div className="flex gap-2 overflow-x-auto border-b border-line px-5 py-3">
          {chips.map((c) => (
            <button key={c.v} type="button" aria-pressed={f === c.v} onClick={() => setF(c.v)} className={cx("h-11 shrink-0 rounded-full border px-4 text-base", f === c.v ? "border-navy-900 bg-navy-900 font-semibold text-white" : "border-line text-ink hover:border-pend")}>
              {c.label}
            </button>
          ))}
        </div>
        <Group title="TODAY" items={today} onOpen={open} />
        <Group title="EARLIER" items={earlier} onOpen={open} />
        {!mine.length && (
          <Empty icon={<BellOff size={26} />} title="No notifications">
            Updates about your lights, repairs and messages show up here. They are not sent by email or SMS.
          </Empty>
        )}
      </div>
    </div>
  );
}

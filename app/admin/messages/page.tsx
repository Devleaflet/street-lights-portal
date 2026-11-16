"use client";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/screens";
import { AppShell, usePortal } from "@/components/shell";
import { Button, Empty, Field, cx, inputCls } from "@/components/ui";
import { when } from "@/lib/format";
import { sendMessage, WARDS } from "@/lib/portal";
import { act } from "@/lib/store";
import type { Audience } from "@/lib/types";

export default function Page() {
  return (
    <AppShell roles={["admin"]}>
      <Messages />
    </AppShell>
  );
}

function decode(v: string): Audience {
  const [t, x] = v.split(":");
  if (t === "role") return { type: "role", role: x as "installer" | "ward" | "coa" };
  if (t === "ward") return { type: "ward", ward: +x };
  if (t === "user") return { type: "user", userId: x };
  return { type: "all" };
}

function Messages() {
  const { data, me } = usePortal();
  const [to, setTo] = useState("ward:4");
  const [text, setText] = useState("");
  const people = data.users.filter((u) => u.status === "active" && u.id !== me.id);

  const send = () => {
    if (act((s, m, now) => sendMessage(s, m, decode(to), text, now), "Message sent · shows in their bell")) setText("");
  };

  return (
    <>
      <PageHeader title="Messages" sub="Messages appear in the bell inside the portal, not by email or SMS" />
      <div className="grid items-start gap-5 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
        <section className="h-fit space-y-4 rounded-2xl border border-line bg-white p-4">
          <h2 className="text-xl font-semibold">New message</h2>
          <Field label="To">
            <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}>
              <option value="all">Everyone</option>
              <option value="role:installer">All installers</option>
              <option value="role:ward">All ward officers</option>
              <option value="role:coa">COA</option>
              <optgroup label="One ward">
                {WARDS.map((w) => (
                  <option key={w} value={`ward:${w}`}>
                    Ward {w} officer
                  </option>
                ))}
              </optgroup>
              <optgroup label="One person">
                {people.map((u) => (
                  <option key={u.id} value={`user:${u.id}`}>
                    {u.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label="Message">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="e.g. Night inspection on Friday" className={cx(inputCls, "h-auto py-3")} />
          </Field>
          <Button variant="dark" size="lg" className="w-full" disabled={!text.trim()} onClick={send}>
            <Send size={20} /> Send
          </Button>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Sent</h2>
          {data.messages.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {data.messages.map((m) => (
                <li key={m.id} className="flex gap-4 px-4 py-3.5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-pend-soft">
                    <MessageCircle size={22} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">To {m.label}</span>
                    <span className="block text-[15px] text-ink/80">&ldquo;{m.text}&rdquo;</span>
                    <span className="block text-sm text-mute">{when(m.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<MessageCircle size={26} />} title="No messages yet" />
          )}
        </section>
      </div>
    </>
  );
}

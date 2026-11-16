"use client";
import { Check, Search, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/screens";
import { AppShell, usePortal } from "@/components/shell";
import { Button, Field, Sheet, inputCls } from "@/components/ui";
import { ROLE_LABEL, initials, when } from "@/lib/format";
import { approveUser, createAccount, declineUser, WARDS } from "@/lib/portal";
import { act } from "@/lib/store";
import type { Role } from "@/lib/types";

export default function Page() {
  return (
    <AppShell roles={["admin"]}>
      <Users />
    </AppShell>
  );
}

const BLANK = { name: "", email: "", password: "demo", role: "ward" as Role, ward: 1 };
const GROUPS: { role: Role; title: string }[] = [
  { role: "ward", title: "Ward officers" },
  { role: "installer", title: "Installers" },
  { role: "coa", title: "COA" },
  { role: "admin", title: "Admin" },
];

function Users() {
  const { data } = usePortal();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(BLANK);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const pending = data.users.filter((u) => u.status === "pending");
  const owned = (id: string) => data.lights.filter((l) => l.ownerId === id && l.status !== "returned").length;

  const create = () => {
    if (act((s, me, now) => createAccount(s, me, f, now), `Account created for ${f.name}`)) {
      setOpen(false);
      setF(BLANK);
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        sub="The admin creates every account except installer sign-ups"
        right={
          <Button variant="dark" onClick={() => setOpen(true)}>
            <UserPlus size={18} /> New account
          </Button>
        }
      />
      <div className="space-y-6 px-4 py-5 lg:px-8">
        {pending.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-semibold">Installer sign-ups to approve</h2>
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {pending.map((u) => (
                <div key={u.id} className="rounded-2xl border border-brand bg-brand-wash p-4">
                  <p className="text-lg font-semibold">{u.name}</p>
                  <p className="text-[15px] text-mute">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""} · asked {when(u.createdAt, false)}
                  </p>
                  <div className="mt-3 flex gap-3">
                    <Button variant="outline" className="flex-1 text-bad-ink" onClick={() => act((s, me) => declineUser(s, me, u.id), `${u.name} declined`)}>
                      <X size={18} /> Decline
                    </Button>
                    <Button variant="ok" className="flex-[1.4]" onClick={() => act((s, me, now) => approveUser(s, me, u.id, now), `${u.name} can now sign in`)}>
                      <Check size={18} /> Approve installer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3.5 focus-within:border-navy-700 sm:w-80">
          <Search size={18} className="text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or ward" aria-label="Search users" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none sm:text-[14px]" />
        </label>
        <div className="grid items-start gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const us = data.users.filter((u) => u.role === g.role && u.status === "active" && (!query || `${u.name} ${u.email} ward ${u.ward ?? ""}`.toLowerCase().includes(query))).sort((a, b) => (a.ward ?? 0) - (b.ward ?? 0));
          if (!us.length) return null;
          return (
            <section key={g.role}>
              <h2 className="mb-3 text-xl font-semibold">
                {g.title} <span className="text-base font-normal text-mute">· {us.length}</span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {us.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pend-soft font-semibold">{initials(u.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{u.name}</span>
                      <span className="block truncate text-sm text-mute">{u.email}</span>
                    </span>
                    <span className="text-right text-sm text-mute">{u.role === "ward" ? `Ward ${u.ward}` : u.role === "installer" ? `${owned(u.id)} lights` : ROLE_LABEL[u.role]}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="New account">
        <div className="space-y-4">
          <Field label="Role">
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} className={inputCls}>
              <option value="ward">Ward officer</option>
              <option value="coa">COA</option>
              <option value="installer">Installer</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          {f.role === "ward" && (
            <Field label="Ward">
              <select value={f.ward} onChange={(e) => setF({ ...f, ward: +e.target.value })} className={inputCls}>
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    Ward {w}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Name">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Email">
            <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Temporary password" hint="Share it with the person. They can sign in straight away.">
            <input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={inputCls} autoComplete="off" />
          </Field>
          <Button variant="dark" size="lg" className="w-full" onClick={create}>
            Create account
          </Button>
        </div>
      </Sheet>
    </>
  );
}

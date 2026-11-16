"use client";
import { ChevronRight, Eye, HardHat, MapPinned, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { HOME } from "@/components/shell";
import { Button, Field, LampIcon, Logo, Spinner, inputCls } from "@/components/ui";
import { login } from "@/lib/portal";
import { DEMO_PASSWORD } from "@/lib/seed";
import { signIn, useSnap } from "@/lib/store";
import type { User } from "@/lib/types";

const DEMOS = [
  { id: "u_admin", role: "Admin", who: "Full access", can: "Approve lights, run repairs, users, messages, exports", icon: ShieldCheck },
  { id: "u_ramesh", role: "Installer", who: "Ramesh K.", can: "Add lights in the field, after-photos", icon: HardHat },
  { id: "u_sita", role: "Installer", who: "Sita M.", can: "Owns SL-05-0311 and other Ward 5 lights", icon: HardHat },
  { id: "u_ward5", role: "Ward officer", who: "Ward 5 · Prakash S.", can: "See Ward 5, report damage", icon: MapPinned },
  { id: "u_ward4", role: "Ward officer", who: "Ward 4 · Kamala D.", can: "See Ward 4, report damage", icon: MapPinned },
  { id: "u_coa", role: "COA", who: "COA Office", can: "View every ward, export to Excel", icon: Eye },
];

const POINTS = [
  "Installers add lights with GPS, SNO, ward and photo",
  "Admin approves, runs repairs and exports Excel",
  "Ward officers report damage in their own ward",
  "COA sees every ward, view only",
];

export default function LoginPage() {
  const snap = useSnap();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (snap?.me) router.replace(HOME[snap.me.role]);
  }, [snap, router]);

  if (!snap || snap.me) return <Spinner />;

  const enter = (u: User) => {
    signIn(u);
    router.replace(HOME[u.role]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      enter(login(snap.data, email, password));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const users = snap.data.users;
  const waiting = users.filter((u) => u.status === "pending").map((u) => u.name);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,560px)]">
      <section className="bg-navy-900 px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="mx-auto max-w-lg lg:mx-0">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-4xl leading-tight font-bold lg:text-5xl">Street Light Portal</h1>
          <p className="mt-3 text-lg text-white/75">One shared record of every street light in the city: installs, approvals, damage and repairs.</p>
        </div>
        <ul className="mx-auto mt-8 hidden max-w-lg space-y-3 text-white/80 lg:mx-0 lg:block">
          {POINTS.map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-navy-800 text-brand">
                <LampIcon className="size-4" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="-mt-8 rounded-t-[28px] bg-canvas px-5 pt-7 pb-10 lg:mt-0 lg:flex lg:items-center lg:rounded-none lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <Field label="Email">
              <input type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@streetlight.demo" />
            </Field>
            <Field label="Password">
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </Field>
            {error && (
              <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad-ink">
                {error}
              </p>
            )}
            <Button type="submit" variant="brand" size="lg" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 mb-3 flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">Demo accounts</h3>
            <span className="text-sm text-mute">password: {DEMO_PASSWORD}</span>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-line bg-white">
            {DEMOS.map((d) => {
              const u = users.find((x) => x.id === d.id);
              if (!u) return null;
              const Icon = d.icon;
              return (
                <li key={d.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => enter(u)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pend-soft text-navy-900">
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {d.role} <span className="font-normal text-mute">· {d.who}</span>
                      </span>
                      <span className="block truncate text-sm text-mute">{d.can}</span>
                    </span>
                    <ChevronRight size={20} className="text-mute" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-4 text-[15px]">
            New installer?{" "}
            <Link href="/signup" className="font-semibold text-link underline">
              Request access
            </Link>
            <span className="text-mute"> The admin approves sign-ups.{waiting.length ? ` Waiting now: ${waiting.join(", ")}` : ""}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

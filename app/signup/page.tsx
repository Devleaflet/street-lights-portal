"use client";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, LinkButton, TaskBar, inputCls } from "@/components/ui";
import { signUpInstaller } from "@/lib/portal";
import { actPublic } from "@/lib/store";

export default function SignUpPage() {
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = actPublic((s, now) => signUpInstaller(s, f, now));
    setError(err);
    if (!err) setDone(true);
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <TaskBar title="Installer sign-up" sub="The admin approves every installer" back="/" />
      <div className="mx-auto max-w-md px-5 py-6">
        {done ? (
          <div className="rounded-2xl border border-line bg-white p-6 text-center">
            <CircleCheck size={44} className="mx-auto text-ok" />
            <h2 className="mt-3 text-xl font-bold">Request sent</h2>
            <p className="mt-1 text-mute">The admin gets a notification. Once approved, sign in with {f.email.trim().toLowerCase()}.</p>
            <p className="mt-3 text-sm text-mute">Demo tip: sign in as Admin, open Users and approve it.</p>
            <LinkButton href="/" variant="dark" className="mt-5 w-full">
              Back to sign in
            </LinkButton>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Full name">
              <input autoComplete="name" value={f.name} onChange={set("name")} className={inputCls} required />
            </Field>
            <Field label="Phone" optional>
              <input type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set("phone")} className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} className={inputCls} required />
            </Field>
            <Field label="Password">
              <input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} className={inputCls} required />
            </Field>
            {error && (
              <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad-ink">
                {error}
              </p>
            )}
            <Button type="submit" variant="brand" size="lg" className="w-full">
              Request installer access
            </Button>
            <p className="text-center text-[15px] text-mute">
              Already approved?{" "}
              <Link href="/" className="font-semibold text-link underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

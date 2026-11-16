"use client";
import { ArrowLeft, CircleCheck, Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, LinkButton, Logo, cx, inputCls } from "@/components/ui";
import { signUpInstaller } from "@/lib/portal";
import { actPublic } from "@/lib/store";

const STEPS = [
  { icon: UserPlus, title: "Request access", body: "Tell us who you are. Takes under a minute." },
  { icon: ShieldCheck, title: "Admin approves", body: "The city admin reviews every installer." },
  { icon: LogIn, title: "Sign in and work", body: "Add lights, report damage, log repairs." },
];

function Steps({ current }: { current: number }) {
  return (
    <ol className="space-y-4">
      {STEPS.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className="flex gap-3">
          <span
            className={cx(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              i < current ? "bg-ok text-white" : i === current ? "bg-brand text-navy-900" : "bg-navy-800 text-white/60",
            )}
          >
            {i < current ? <CircleCheck size={20} /> : <Icon size={20} />}
          </span>
          <span>
            <span className="block font-semibold text-white">{title}</span>
            <span className="block text-[15px] text-white/65">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function SignUpPage() {
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = actPublic((s, now) => signUpInstaller(s, f, now));
    setError(err);
    if (!err) setDone(true);
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,560px)]">
      <section className="bg-navy-900 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-14 text-white sm:px-8 lg:flex lg:flex-col lg:p-12">
        <Link href="/" className="-ml-2 inline-flex h-11 items-center gap-2 self-start rounded-xl px-2 text-[15px] font-semibold text-white/80 hover:bg-navy-800 hover:text-white">
          <ArrowLeft size={20} /> Back to sign in
        </Link>
        <div className="mx-auto mt-5 max-w-md lg:mx-0 lg:mt-auto lg:max-w-lg">
          <Logo size="lg" />
          <h1 className="mt-5 font-display text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">Join as an installer</h1>
          <p className="mt-3 text-base text-white/75 sm:text-lg">Field crews use the portal to record new lights, flag damage and close out repairs.</p>
        </div>
        <div className="mt-10 mb-auto hidden max-w-lg lg:block">
          <Steps current={done ? 2 : 0} />
        </div>
      </section>

      <section className="-mt-8 rounded-t-[28px] bg-canvas px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:mt-0 lg:flex lg:items-center lg:rounded-none lg:px-12">
        <div className="animate-rise mx-auto w-full max-w-md">
          {done ? (
            <div className="rounded-2xl border border-line bg-white p-6 text-center sm:p-8">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-ok-soft text-ok">
                <CircleCheck size={34} />
              </span>
              <h2 className="mt-4 text-2xl font-bold">Request sent</h2>
              <p className="mt-2 text-mute">
                The admin has been notified. Once approved, sign in with <span className="font-semibold break-all text-ink">{f.email.trim().toLowerCase()}</span>.
              </p>
              <div className="mt-5 rounded-xl bg-brand-wash px-4 py-3 text-left text-sm text-brand-ink">
                <span className="font-semibold">Demo tip:</span> sign in as Admin, open Users and approve this request.
              </div>
              <LinkButton href="/" variant="dark" size="lg" className="mt-6 w-full">
                Back to sign in
              </LinkButton>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-8">
              <h2 className="text-2xl font-bold">Create your account</h2>
              <p className="mt-1 text-[15px] text-mute">Access starts after an admin approves it.</p>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                <Field label="Full name">
                  <input autoComplete="name" value={f.name} onChange={set("name")} className={inputCls} placeholder="Ravi Kumar" required />
                </Field>
                <Field label="Email">
                  <input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} className={inputCls} placeholder="you@company.com" required />
                </Field>
                <Field label="Phone" optional hint="Lets the admin reach you about field work.">
                  <input type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set("phone")} className={inputCls} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Password">
                  <span className="relative block">
                    <input type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={set("password")} className={cx(inputCls, "pr-12")} required />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Hide password" : "Show password"}
                      aria-pressed={show}
                      className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-mute hover:text-ink"
                    >
                      {show ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </span>
                </Field>

                {error && (
                  <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad-ink">
                    {error}
                  </p>
                )}

                <Button type="submit" variant="brand" size="lg" className="w-full">
                  Request installer access
                </Button>
              </form>
            </div>
          )}

          {!done && (
            <p className="mt-5 text-center text-[15px] text-mute">
              Already approved?{" "}
              <Link href="/" className="font-semibold text-link underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

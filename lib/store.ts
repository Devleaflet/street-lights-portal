"use client";
// Demo persistence: localStorage stands in for Firebase. Same-browser tabs stay in sync
// through the `storage` event, so admin + installer tabs side by side update "live".
import { useSyncExternalStore } from "react";
import { addLight } from "./portal";
import { seed } from "./seed";
import type { NewLight, State, User } from "./types";

const DATA_KEY = "slp.data.v1";
const SESSION_KEY = "slp.session";
const OUTBOX_KEY = "slp.outbox";
const OFFLINE_KEY = "slp.offline";

interface Outboxed {
  id: string;
  userId: string;
  input: NewLight;
  at: string;
}

interface Snapshot {
  data: State;
  me: User | null;
  outbox: Outboxed[];
  offline: boolean; // simulated "no signal" or navigator offline
}

let snap: Snapshot | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const read = <T,>(k: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    toast("This browser's demo storage is full. Reset demo data from your profile.", "error");
  }
}

function build(): Snapshot {
  let data = read<State | null>(DATA_KEY, null);
  if (!data) {
    data = seed();
    write(DATA_KEY, data);
  }
  const id = read<string | null>(SESSION_KEY, null);
  const me = data.users.find((u) => u.id === id && u.status === "active") ?? null;
  return {
    data,
    me,
    outbox: read<Outboxed[]>(OUTBOX_KEY, []),
    offline: read<boolean>(OFFLINE_KEY, false) || (typeof navigator !== "undefined" && !navigator.onLine),
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onExternal);
    window.addEventListener("online", onExternal);
    window.addEventListener("offline", onExternal);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      window.removeEventListener("storage", onExternal);
      window.removeEventListener("online", onExternal);
      window.removeEventListener("offline", onExternal);
    }
  };
}

function onExternal() {
  snap = build();
  emit();
  flushOutbox();
}

const getSnap = () => (snap ??= build());
const getServer = () => null;

/** null while rendering on the server / before hydration. */
export const useSnap = () => useSyncExternalStore(subscribe, getSnap, getServer);

function commit(next: Partial<Snapshot>) {
  snap = { ...getSnap(), ...next };
  if (next.data) write(DATA_KEY, snap.data);
  if (next.outbox) write(OUTBOX_KEY, snap.outbox);
  emit();
}

export const nowIso = () => new Date().toISOString();

/** Run a domain action as the signed-in user. Errors become toasts; returns true on success. */
export function act(fn: (s: State, me: User, now: string) => State, success?: string): boolean {
  const { data, me } = getSnap();
  if (!me) return false;
  try {
    commit({ data: fn(data, me, nowIso()) });
    if (success) toast(success);
    return true;
  } catch (e) {
    toast((e as Error).message, "error");
    return false;
  }
}

/** Actions that don't need a session (sign-up). */
export function actPublic(fn: (s: State, now: string) => State): string | null {
  try {
    commit({ data: fn(getSnap().data, nowIso()) });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export function signIn(user: User) {
  write(SESSION_KEY, user.id);
  commit({ me: user });
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  commit({ me: null });
}

export function resetDemo() {
  const data = seed();
  write(DATA_KEY, data);
  write(OUTBOX_KEY, []);
  const me = getSnap().me;
  commit({ data, outbox: [], me: me && data.users.find((u) => u.id === me.id) ? me : null });
  toast("Demo data reset");
}

// ── offline outbox ("No signal. Saved on this phone, will upload automatically.") ──

export function setSimulatedOffline(v: boolean) {
  write(OFFLINE_KEY, v);
  commit({ offline: v || !navigator.onLine });
  if (!v) flushOutbox();
}

export function queueLight(input: NewLight) {
  const { me, outbox } = getSnap();
  if (!me) return;
  commit({ outbox: [...outbox, { id: `q_${Date.now()}`, userId: me.id, input, at: nowIso() }] });
}

export function flushOutbox() {
  const s = getSnap();
  if (s.offline || !s.me || !s.outbox.some((o) => o.userId === s.me!.id)) return;
  let data = s.data;
  const left: Outboxed[] = [];
  let sent = 0;
  for (const o of s.outbox) {
    if (o.userId !== s.me.id) {
      left.push(o);
      continue;
    }
    try {
      data = addLight(data, s.me, { ...o.input, installedAt: o.at }, nowIso());
      sent++;
    } catch (e) {
      toast(`${o.input.sno}: ${(e as Error).message}`, "error");
    }
  }
  commit({ data, outbox: left });
  if (sent) toast(`${sent} saved light${sent > 1 ? "s" : ""} uploaded`);
}

// ── toasts ──

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "error";
}
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();

export function toast(text: string, tone: Toast["tone"] = "info") {
  const t = { id: Date.now() + Math.random(), text, tone };
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l());
  }, 3600);
}

const EMPTY: Toast[] = [];
export const useToasts = () =>
  useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts,
    () => EMPTY,
  );

// Business rules for the Street Light Portal. Pure functions: (state, actor, …) → new state.
// Every role check lives here (stands in for the Firebase security rules), so the UI can't bypass it.
import type {
  Audience,
  ExportRow,
  ExportScope,
  Light,
  NewLight,
  Notification,
  Repair,
  Role,
  State,
  User,
} from "./types";

export const WARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** City bounding box split into a 3×3 grid → wards 1..9 (row-major from north-west). */
export const BOUNDS = { south: 27.65, north: 27.71, west: 85.26, east: 85.335 };

export const COMPLAINTS = ["Not lighting", "Flickering", "On in daytime", "Pole damaged", "Wires exposed", "Other"];

let seq = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const deny = (): never => {
  throw new Error("Not allowed for your role.");
};
const must = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};
const isAdmin = (u: User) => u.role === "admin";
const requireAdmin = (u: User) => (isAdmin(u) ? undefined : deny());

export function wardFromGps(lat: number, lng: number): number {
  const clamp = (v: number) => Math.min(2, Math.max(0, Math.floor(v * 3)));
  const row = clamp((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south));
  const col = clamp((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west));
  return row * 3 + col + 1;
}

export const normalizeSno = (sno: string) => sno.trim().toUpperCase();
export const isValidSno = (sno: string) => /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(normalizeSno(sno));
export const snoExists = (s: State, sno: string) => s.lights.some((l) => l.sno === normalizeSno(sno));

const userName = (s: State, id: string) => s.users.find((u) => u.id === id)?.name ?? "—";
const admins = (s: State) => s.users.filter((u) => u.role === "admin" && u.status === "active");

function note(to: string, n: Omit<Notification, "id" | "to" | "read">): Notification {
  return { id: uid("n"), to, read: false, ...n };
}
const toAdmins = (s: State, n: Omit<Notification, "id" | "to" | "read">) => admins(s).map((a) => note(a.id, n));

// ── accounts ────────────────────────────────────────────────────────────────

export function login(s: State, email: string, password: string): User {
  const u = s.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.password !== password) throw new Error("Wrong email or password.");
  if (u.status === "pending") throw new Error("Your installer account is waiting for admin approval.");
  return u;
}

function assertNewEmail(s: State, email: string) {
  must(/^\S+@\S+$/.test(email.trim()), "Enter a valid email.");
  must(!s.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()), "That email is already registered.");
}

export function signUpInstaller(
  s: State,
  i: { name: string; email: string; password: string; phone?: string },
  now: string,
): State {
  must(i.name.trim(), "Enter your name.");
  must(i.password, "Choose a password.");
  assertNewEmail(s, i.email);
  const u: User = {
    id: uid("u"),
    name: i.name.trim(),
    email: i.email.trim().toLowerCase(),
    password: i.password,
    phone: i.phone?.trim() || undefined,
    role: "installer",
    status: "pending",
    createdAt: now,
  };
  return {
    ...s,
    users: [...s.users, u],
    notifications: [
      ...toAdmins(s, { kind: "user", icon: "user", title: "New installer sign-up", body: `${u.name} wants installer access`, at: now, href: "/admin/users" }),
      ...s.notifications,
    ],
  };
}

export function approveUser(s: State, a: User, id: string, now: string): State {
  requireAdmin(a);
  const u = s.users.find((x) => x.id === id);
  must(u && u.status === "pending", "That sign-up is not waiting for approval.");
  return {
    ...s,
    users: s.users.map((x) => (x.id === id ? { ...x, status: "active" } : x)),
    notifications: [
      note(id, { kind: "user", icon: "check", title: "Your account is approved", body: "You can now add lights in the field.", at: now }),
      ...s.notifications,
    ],
  };
}

export function declineUser(s: State, a: User, id: string): State {
  requireAdmin(a);
  must(s.users.some((x) => x.id === id && x.status === "pending"), "That sign-up is not waiting for approval.");
  return { ...s, users: s.users.filter((x) => x.id !== id) };
}

export function createAccount(
  s: State,
  a: User,
  i: { name: string; email: string; password: string; role: Role; ward?: number },
  now: string,
): State {
  requireAdmin(a);
  must(i.name.trim(), "Enter a name.");
  must(i.password, "Set a password.");
  assertNewEmail(s, i.email);
  if (i.role === "ward") must(i.ward && i.ward >= 1 && i.ward <= 9, "Pick the ward (1 to 9) for this officer.");
  const u: User = {
    id: uid("u"),
    name: i.name.trim(),
    email: i.email.trim().toLowerCase(),
    password: i.password,
    role: i.role,
    ward: i.role === "ward" ? i.ward : undefined,
    status: "active",
    createdAt: now,
  };
  return { ...s, users: [...s.users, u] };
}

// ── visibility ──────────────────────────────────────────────────────────────

export function canSee(a: User, l: Light): boolean {
  switch (a.role) {
    case "admin":
      return true;
    case "installer":
      return l.ownerId === a.id;
    case "ward":
      return l.ward === a.ward && (l.status === "working" || l.status === "damaged");
    case "coa":
      return l.status === "working" || l.status === "damaged";
  }
}

export const visibleLights = (s: State, a: User) => s.lights.filter((l) => canSee(a, l));

export const findLight = (s: State, a: User, sno: string) =>
  s.lights.find((l) => l.sno === normalizeSno(sno) && canSee(a, l));

// ── adding & approving lights ───────────────────────────────────────────────

export function addLight(s: State, a: User, i: NewLight, now: string): State {
  if (a.role !== "admin" && a.role !== "installer") deny();
  const sno = normalizeSno(i.sno);
  must(isValidSno(sno), "Enter the serial number printed on the light.");
  must(!snoExists(s, sno), `${sno} is already in the system.`);
  must(Number.isInteger(i.ward) && i.ward >= 1 && i.ward <= 9, "Pick a ward from 1 to 9.");
  must(Number.isFinite(i.lat) && Number.isFinite(i.lng), "Capture the GPS location first.");
  const admin = isAdmin(a);
  must(i.photo, "Take a photo of the light.");
  const ownerId = admin && i.ownerId ? i.ownerId : a.id;
  if (admin && i.ownerId) must(s.users.some((u) => u.id === i.ownerId && u.role === "installer"), "Pick an installer.");

  const light: Light = {
    id: uid("l"),
    sno,
    ward: i.ward,
    lat: i.lat,
    lng: i.lng,
    accuracy: Math.round(i.accuracy),
    installedAt: i.installedAt ?? now,
    ownerId,
    addedBy: a.id,
    status: admin ? "working" : "pending",
    approvedAt: admin ? now : undefined,
    photo: i.photo,
    repairCount: 0,
  };
  const notifications = admin
    ? ownerId !== a.id
      ? [note(ownerId, { kind: "approval", icon: "check", title: `${sno} added for you`, body: `Admin added a light in Ward ${i.ward} on your behalf`, at: now, href: `/light?sno=${sno}` })]
      : []
    : toAdmins(s, { kind: "approval", icon: "lamp", title: "New light to approve", body: `${a.name} added ${sno} in Ward ${i.ward}`, at: now, href: "/admin/approvals" });
  return { ...s, lights: [light, ...s.lights], notifications: [...notifications, ...s.notifications] };
}

function getLight(s: State, id: string) {
  const l = s.lights.find((x) => x.id === id);
  must(l, "Light not found.");
  return l!;
}
const patchLight = (s: State, id: string, p: Partial<Light>) => s.lights.map((l) => (l.id === id ? { ...l, ...p } : l));

export function approveLight(s: State, a: User, id: string, now: string): State {
  requireAdmin(a);
  const l = getLight(s, id);
  must(l.status === "pending", `${l.sno} is not pending.`);
  return {
    ...s,
    lights: patchLight(s, id, { status: "working", approvedAt: now, returnReason: undefined }),
    notifications: [
      note(l.ownerId, { kind: "approval", icon: "check", title: `${l.sno} approved`, body: `Ward ${l.ward} · now live for the ward officer and COA`, at: now, href: `/light?sno=${l.sno}` }),
      ...s.notifications,
    ],
  };
}

export function sendBackLight(s: State, a: User, id: string, reason: string, now: string): State {
  requireAdmin(a);
  const l = getLight(s, id);
  must(l.status === "pending", `${l.sno} is not pending.`);
  const why = reason.trim() || "Please check and resubmit.";
  return {
    ...s,
    lights: patchLight(s, id, { status: "returned", returnReason: why }),
    notifications: [note(l.ownerId, { kind: "approval", icon: "undo", title: `${l.sno} sent back`, body: why, at: now }), ...s.notifications],
  };
}

export function resubmitLight(s: State, a: User, id: string, now: string): State {
  const l = getLight(s, id);
  if (!(isAdmin(a) || (a.role === "installer" && l.ownerId === a.id))) deny();
  must(l.status === "returned", `${l.sno} was not sent back.`);
  return {
    ...s,
    lights: patchLight(s, id, { status: "pending", returnReason: undefined }),
    notifications: [
      ...toAdmins(s, { kind: "approval", icon: "lamp", title: "Light resubmitted", body: `${a.name} resubmitted ${l.sno}`, at: now, href: "/admin/approvals" }),
      ...s.notifications,
    ],
  };
}

// ── repairs ─────────────────────────────────────────────────────────────────

export const openRepairFor = (s: State, lightId: string) => s.repairs.find((r) => r.lightId === lightId && r.stage !== "repaired");

function getRepair(s: State, id: string) {
  const r = s.repairs.find((x) => x.id === id);
  must(r, "Repair not found.");
  return r!;
}
const patchRepair = (s: State, id: string, p: Partial<Repair>) => s.repairs.map((r) => (r.id === id ? { ...r, ...p } : r));

export function reportDamage(s: State, a: User, i: { sno: string; complaint: string; note?: string }, now: string): State {
  if (a.role !== "ward" && a.role !== "admin") deny();
  const l = findLight(s, a, i.sno);
  must(l, `${normalizeSno(i.sno)} was not found in your ward.`);
  must(!openRepairFor(s, l!.id), `${l!.sno} is already reported. You'll get an update when it's fixed.`);
  must(i.complaint.trim(), "Say what's wrong.");
  const r: Repair = {
    id: uid("r"),
    lightId: l!.id,
    sno: l!.sno,
    ward: l!.ward,
    complaint: i.complaint.trim(),
    note: i.note?.trim() || undefined,
    reportedBy: a.id,
    reportedAt: now,
    stage: "reported",
  };
  const who = a.role === "ward" ? `Ward ${a.ward} officer` : a.name;
  return {
    ...s,
    repairs: [r, ...s.repairs],
    notifications: [
      ...toAdmins(s, { kind: "repair", icon: "alert", title: `Damage reported: ${l!.sno}`, body: `${who}: "${r.complaint}"`, at: now, href: "/admin/repairs" }),
      ...s.notifications,
    ],
  };
}

export function notifyOwner(s: State, a: User, id: string, now: string): State {
  requireAdmin(a);
  const r = getRepair(s, id);
  must(r.stage === "reported", "Owner was already notified.");
  const l = getLight(s, r.lightId);
  return {
    ...s,
    repairs: patchRepair(s, id, { stage: "notified", notifiedAt: now }),
    lights: patchLight(s, l.id, { status: "damaged" }),
    notifications: [
      note(l.ownerId, { kind: "repair", icon: "wrench", title: `Repair needed: ${l.sno}`, body: `Ward ${l.ward}: "${r.complaint}". Fix, then add the after-photo.`, at: now, href: "/installer" }),
      ...s.notifications,
    ],
  };
}

export function remindOwner(s: State, a: User, id: string, now: string): State {
  requireAdmin(a);
  const r = getRepair(s, id);
  must(r.stage === "notified", "Nothing to remind about.");
  const l = getLight(s, r.lightId);
  return {
    ...s,
    notifications: [
      note(l.ownerId, { kind: "repair", icon: "wrench", title: `Reminder: ${l.sno}`, body: `Still waiting for the after-maintenance photo`, at: now, href: "/installer" }),
      ...s.notifications,
    ],
  };
}

export function addAfterPhoto(s: State, a: User, id: string, photo: string, now: string): State {
  const r = getRepair(s, id);
  const l = getLight(s, r.lightId);
  if (!(isAdmin(a) || (a.role === "installer" && l.ownerId === a.id))) deny();
  must(r.stage === "notified" || r.stage === "photo", "This repair is not waiting for a photo.");
  must(photo, "Take the after-maintenance photo.");
  const notifications = isAdmin(a)
    ? []
    : toAdmins(s, { kind: "repair", icon: "camera", title: `After-photo added: ${l.sno}`, body: "Ready to mark repaired", at: now, href: "/admin/repairs" });
  return {
    ...s,
    repairs: patchRepair(s, id, { stage: "photo", afterPhoto: photo, afterPhotoAt: now, afterPhotoBy: a.id }),
    notifications: [...notifications, ...s.notifications],
  };
}

export function markRepaired(s: State, a: User, id: string, now: string): State {
  requireAdmin(a);
  const r = getRepair(s, id);
  must(r.stage === "photo", "Add the after-photo before marking repaired.");
  const l = getLight(s, r.lightId);
  const count = l.repairCount + 1;
  const body = `Back to working · repair count now ${count}`;
  const recipients = [...new Set([l.ownerId, r.reportedBy])].filter((x) => x !== a.id);
  return {
    ...s,
    repairs: patchRepair(s, id, { stage: "repaired", repairedAt: now }),
    lights: patchLight(s, l.id, { status: "working", repairCount: count }),
    notifications: [
      ...recipients.map((to) => note(to, { kind: "repair", icon: "check", title: `${l.sno} marked repaired`, body, at: now, href: `/light?sno=${l.sno}` })),
      ...s.notifications,
    ],
  };
}

export function visibleRepairs(s: State, a: User): Repair[] {
  if (a.role === "installer") {
    const mine = new Set(s.lights.filter((l) => l.ownerId === a.id).map((l) => l.id));
    return s.repairs.filter((r) => mine.has(r.lightId));
  }
  if (a.role === "ward") return s.repairs.filter((r) => r.ward === a.ward);
  return s.repairs;
}

export function lightHistory(s: State, a: User, sno: string) {
  const light = findLight(s, a, sno);
  if (!light) return undefined;
  const repairs = s.repairs.filter((r) => r.lightId === light.id).sort((x, y) => y.reportedAt.localeCompare(x.reportedAt));
  return { light, repairs };
}

// ── messages & notifications ────────────────────────────────────────────────

const ROLE_LABEL: Record<Role, string> = { admin: "Admins", installer: "All installers", ward: "All ward officers", coa: "COA" };

export function audienceLabel(s: State, aud: Audience) {
  if (aud.type === "all") return "Everyone";
  if (aud.type === "role") return ROLE_LABEL[aud.role];
  if (aud.type === "ward") return `Ward ${aud.ward}`;
  return userName(s, aud.userId);
}

export function sendMessage(s: State, a: User, aud: Audience, text: string, now: string): State {
  requireAdmin(a);
  must(text.trim(), "Message is empty.");
  const to = s.users.filter((u) => {
    if (u.id === a.id || u.status !== "active") return false;
    if (aud.type === "all") return true;
    if (aud.type === "role") return u.role === aud.role;
    if (aud.type === "ward") return u.role === "ward" && u.ward === aud.ward;
    return u.id === aud.userId;
  });
  must(to.length, "No one to send to.");
  const label = audienceLabel(s, aud);
  return {
    ...s,
    messages: [{ id: uid("m"), from: a.id, audience: aud, label, text: text.trim(), at: now }, ...s.messages],
    notifications: [
      ...to.map((u) => note(u.id, { kind: "message", icon: "message", title: `Message from ${a.name}`, body: text.trim(), at: now })),
      ...s.notifications,
    ],
  };
}

export const markAllRead = (s: State, u: User): State => ({
  ...s,
  notifications: s.notifications.map((n) => (n.to === u.id ? { ...n, read: true } : n)),
});

export const markRead = (s: State, id: string): State => ({
  ...s,
  notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
});

// ── exports & stats ─────────────────────────────────────────────────────────

export function condition(s: State, l: Light): string {
  if (l.status === "pending") return "Pending approval";
  if (l.status === "returned") return "Sent back";
  const r = openRepairFor(s, l.id);
  if (l.status === "damaged") return r?.stage === "photo" ? "Damaged · after-photo added" : "Damaged";
  return r ? "Reported" : "Working";
}

export function exportRows(s: State, a: User, scope: ExportScope): ExportRow[] {
  if (a.role === "installer") deny();
  if (a.role === "ward" && scope.type === "ward" && scope.ward !== a.ward) deny();
  let lights = visibleLights(s, a);
  if (scope.type === "ward") lights = lights.filter((l) => l.ward === scope.ward);
  if (scope.type === "sno") lights = lights.filter((l) => l.sno === normalizeSno(scope.sno));
  return lights
    .slice()
    .sort((x, y) => x.ward - y.ward || x.sno.localeCompare(y.sno))
    .map((l) => ({
      sno: l.sno,
      ward: l.ward,
      lat: l.lat,
      lng: l.lng,
      installedAt: l.installedAt,
      owner: userName(s, l.ownerId),
      condition: condition(s, l),
      repairCount: l.repairCount,
      photo: l.photo,
    }));
}

export function wardStats(s: State, a: User) {
  const lights = visibleLights(s, a);
  return WARDS.map((ward) => {
    const w = lights.filter((l) => l.ward === ward);
    return {
      ward,
      total: w.filter((l) => l.status !== "returned").length,
      working: w.filter((l) => l.status === "working").length,
      damaged: w.filter((l) => l.status === "damaged").length,
      pending: w.filter((l) => l.status === "pending").length,
    };
  });
}

/** Approx. ground distance in metres (equirectangular — fine at city scale). */
export function metresBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dy = (lat2 - lat1) * 110540;
  const dx = (lng2 - lng1) * 111320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(dx, dy);
}

export function nearestLight(s: State, lat: number, lng: number, radius: number, excludeId?: string) {
  let best: { light: Light; metres: number } | undefined;
  for (const l of s.lights) {
    if (l.id === excludeId || l.status === "returned") continue;
    const metres = metresBetween(lat, lng, l.lat, l.lng);
    if (metres <= radius && (!best || metres < best.metres)) best = { light: l, metres: Math.round(metres) };
  }
  return best;
}

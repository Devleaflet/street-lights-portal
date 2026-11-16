const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const daysBetween = (a: string | Date, b: string | Date = new Date()) =>
  Math.round((startOfDay(new Date(b)) - startOfDay(new Date(a))) / 864e5);

export const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
export const date = (iso: string) => `${day(iso)} ${new Date(iso).getFullYear()}`;
export const month = (iso: string) => MON[new Date(iso).getMonth()];
export const clock = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** "Today, 9:12" · "Yesterday" · "14 Nov" */
export function when(iso: string, withTime = true) {
  const n = daysBetween(iso);
  if (n <= 0) return withTime ? `Today, ${clock(iso)}` : "Today";
  if (n === 1) return "Yesterday";
  return day(iso);
}

/** Notification style: time only for today. */
export const stamp = (iso: string) => (daysBetween(iso) <= 0 ? clock(iso) : when(iso));

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function gpsQuality(m: number): { label: string; tone: "ok" | "wait" | "bad" } {
  if (m <= 10) return { label: "good", tone: "ok" };
  if (m <= 20) return { label: "fair", tone: "wait" };
  return { label: "check location", tone: "bad" };
}

export const ROLE_LABEL = { admin: "Admin", installer: "Installer", ward: "Ward officer", coa: "COA" } as const;

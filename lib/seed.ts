// Deterministic demo data that reproduces the numbers in the UI mockups
// (642 lights · 628 working · 8 pending · 6 open repairs, SL-05-0311 history, etc.).
// All dates are relative to "today" so the demo always reads "Today, 9:12".
import { BOUNDS } from "./portal";
import type { Light, Message, Notification, Repair, State, User } from "./types";

export const DEMO_PASSWORD = "demo";
const WARD_TOTALS = [74, 81, 66, 70, 79, 68, 70, 66, 68];
const PLACES = [
  "Near Bus Park road", "Temple gate", "School junction", "Hospital road", "Market chowk",
  "River bridge", "Ward office", "Bus stop", "Football ground", "Health post", "Old palace lane", "Ring road turn",
];
const PAST_COMPLAINTS = ["Not lighting", "Flickering", "On in daytime", "Pole damaged", "Wires exposed"];

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sno = (ward: number, n: number) => `SL-${String(ward).padStart(2, "0")}-${String(n).padStart(4, "0")}`;

interface Special {
  sno: string;
  owner: string;
  status?: "pending";
  installed: [number, string]; // [days ago, "HH:MM"]
  accuracy?: number;
  lat?: number;
  lng?: number;
  place?: string;
}

const SPECIALS: Special[] = [
  { sno: "SL-01-0089", owner: "u_ramesh", installed: [140, "11:20"] },
  { sno: "SL-01-0140", owner: "u_arjun", status: "pending", installed: [1, "10:05"], accuracy: 6 },
  { sno: "SL-02-0233", owner: "u_ramesh", status: "pending", installed: [1, "12:30"], accuracy: 28 },
  { sno: "SL-02-0144", owner: "u_maya", installed: [190, "09:40"] },
  { sno: "SL-03-0458", owner: "u_ramesh", status: "pending", installed: [1, "16:42"], accuracy: 4, lat: 27.7041, lng: 85.3206 },
  { sno: "SL-03-0457", owner: "u_ramesh", installed: [9, "15:10"], lat: 27.704154, lng: 85.3206 },
  { sno: "SL-03-0454", owner: "u_ramesh", status: "pending", installed: [0, "08:40"], accuracy: 5 },
  { sno: "SL-03-0451", owner: "u_ramesh", installed: [6, "14:00"] },
  { sno: "SL-04-0217", owner: "u_ramesh", installed: [210, "10:00"] },
  { sno: "SL-04-0163", owner: "u_ramesh", installed: [230, "13:15"] },
  { sno: "SL-05-0311", owner: "u_sita", installed: [258, "11:00"] },
  { sno: "SL-05-0198", owner: "u_sita", installed: [170, "10:30"] },
  { sno: "SL-05-0240", owner: "u_sita", installed: [120, "15:45"] },
  { sno: "SL-05-0207", owner: "u_arjun", installed: [200, "09:15"], place: "Near Bus Park road" },
  { sno: "SL-06-0088", owner: "u_sita", status: "pending", installed: [2, "09:50"], accuracy: 6 },
  { sno: "SL-07-0102", owner: "u_sita", status: "pending", installed: [1, "11:35"], accuracy: 7 },
  { sno: "SL-08-0120", owner: "u_arjun", status: "pending", installed: [1, "14:20"], accuracy: 5 },
  { sno: "SL-09-0075", owner: "u_arjun", status: "pending", installed: [0, "07:30"], accuracy: 8 },
];

export function seed(today: Date = new Date()): State {
  const rand = mulberry32(642);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const at = (daysAgo: number, hhmm = "10:00") => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(base);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const time = () => `${String(int(7, 17)).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")}`;

  // ── users ──
  const u = (id: string, name: string, role: User["role"], extra: Partial<User> = {}): User => ({
    id,
    name,
    email: `${id.slice(2)}@streetlight.demo`,
    password: DEMO_PASSWORD,
    role,
    status: "active",
    createdAt: at(300),
    ...extra,
  });
  const officers = ["Hari B.", "Gita S.", "Rajan T.", "Kamala D.", "Prakash S.", "Anita R.", "Dipak M.", "Sunita K.", "Bishnu P."];
  const users: User[] = [
    u("u_admin", "Admin", "admin"),
    u("u_ramesh", "Ramesh K.", "installer", { phone: "98410 22113" }),
    u("u_sita", "Sita M.", "installer", { phone: "98510 44871" }),
    u("u_arjun", "Arjun P.", "installer", { phone: "98030 11902" }),
    u("u_maya", "Maya G.", "installer", { phone: "98600 75520" }),
    ...officers.map((name, i) => u(`u_ward${i + 1}`, name, "ward", { ward: i + 1 })),
    u("u_coa", "COA Office", "coa"),
    u("u_bikash", "Bikash T.", "installer", { status: "pending", createdAt: at(1, "18:20"), phone: "98120 66310" }),
    u("u_nisha", "Nisha R.", "installer", { status: "pending", createdAt: at(0, "06:45"), phone: "98230 90017" }),
  ];

  // ── lights ──
  const cell = (ward: number) => {
    const row = Math.floor((ward - 1) / 3);
    const col = (ward - 1) % 3;
    const dLat = (BOUNDS.north - BOUNDS.south) / 3;
    const dLng = (BOUNDS.east - BOUNDS.west) / 3;
    return {
      lat: () => +(BOUNDS.north - dLat * (row + 0.08 + rand() * 0.84)).toFixed(6),
      lng: () => +(BOUNDS.west + dLng * (col + 0.08 + rand() * 0.84)).toFixed(6),
    };
  };

  const lights: Light[] = [];
  const special = new Map(SPECIALS.map((s) => [s.sno, s]));
  for (let w = 1; w <= 9; w++) {
    const prefix = sno(w, 0).slice(0, 6);
    const used = new Set(SPECIALS.filter((s) => s.sno.startsWith(prefix)).map((s) => Number(s.sno.slice(-4))));
    while (used.size < WARD_TOTALS[w - 1]) used.add(int(1, 470));
    const c = cell(w);
    for (const n of [...used].sort((a, b) => a - b)) {
      const code = sno(w, n);
      const sp = special.get(code);
      const installed = sp ? at(...sp.installed) : at(int(12, 320), time());
      lights.push({
        id: `l_${code}`,
        sno: code,
        ward: w,
        lat: sp?.lat ?? c.lat(),
        lng: sp?.lng ?? c.lng(),
        accuracy: sp?.accuracy ?? int(3, 9),
        installedAt: installed,
        ownerId: sp?.owner ?? "",
        addedBy: sp?.owner ?? "",
        status: sp?.status ?? "working",
        approvedAt: sp?.status ? undefined : installed,
        repairCount: 0,
        place: sp?.place ?? pick(PLACES),
      });
    }
  }

  // owners for the generic lights: Ramesh gets exactly 46 approved (as on "My lights")
  const generic = lights.filter((l) => !special.has(l.sno));
  const rameshApproved = lights.filter((l) => l.ownerId === "u_ramesh" && l.status !== "pending").length;
  const westPool = generic.filter((l) => l.ward <= 4);
  for (let i = 0; i < 46 - rameshApproved; i++) {
    westPool.splice(Math.floor(rand() * westPool.length), 1)[0].ownerId = "u_ramesh";
  }
  for (const l of generic) {
    if (!l.ownerId) l.ownerId = l.ward <= 4 ? "u_maya" : l.ward <= 6 ? "u_sita" : pick(["u_arjun", "u_maya"]);
    l.addedBy = l.ownerId;
  }

  // ── repairs ──
  const repairs: Repair[] = [];
  const byS = (s: string) => lights.find((l) => l.sno === s)!;
  const officerOf = (ward: number) => `u_ward${ward}`;
  let rn = 0;
  const done = (l: Light, complaint: string, from: number, to: number) => {
    repairs.push({
      id: `r_${++rn}`,
      lightId: l.id,
      sno: l.sno,
      ward: l.ward,
      complaint,
      reportedBy: officerOf(l.ward),
      reportedAt: at(from, time()),
      stage: "repaired",
      notifiedAt: at(from, "18:00"),
      afterPhotoAt: at(to, "11:00"),
      afterPhotoBy: l.ownerId,
      repairedAt: at(to, "16:00"),
    });
    l.repairCount++;
  };
  const open = (l: Light, complaint: string, stage: Repair["stage"], reported: [number, string], extra: Partial<Repair> = {}) => {
    repairs.push({
      id: `r_${++rn}`,
      lightId: l.id,
      sno: l.sno,
      ward: l.ward,
      complaint,
      reportedBy: officerOf(l.ward),
      reportedAt: at(...reported),
      stage,
      ...extra,
    });
    if (stage !== "reported") l.status = "damaged";
  };

  // SL-05-0311: Flickering (Jun 12→14), Not lighting (Sep 2→5), new report today 9:12
  const s0311 = byS("SL-05-0311");
  done(s0311, "Flickering", 157, 155);
  done(s0311, "Not lighting", 75, 72);
  done(byS("SL-04-0217"), "Not lighting", 95, 93);
  done(byS("SL-02-0144"), "Flickering", 4, 2);

  // background history: older repairs + 3 more finished in the last 7 days
  const candidates = generic.filter((l) => l.status === "working");
  for (let i = 0; i < 48; i++) {
    const l = candidates[Math.floor(rand() * candidates.length)];
    const installedAgo = Math.round((base.getTime() - new Date(l.installedAt).getTime()) / 864e5);
    if (installedAgo < 30) continue;
    const from = int(12, installedAgo - 5);
    done(l, pick(PAST_COMPLAINTS), from, Math.max(9, from - int(1, 4)));
  }
  for (const [from, to] of [[3, 1], [5, 3], [7, 5]]) {
    const l = candidates.find((x) => x.repairCount === 0)!;
    done(l, pick(PAST_COMPLAINTS), from, to);
  }

  open(s0311, "Not lighting at night", "reported", [0, "09:12"]);
  open(byS("SL-04-0217"), "Pole leaning after truck hit", "notified", [2, "10:20"], { notifiedAt: at(2, "12:00") });
  open(byS("SL-05-0198"), "Wires hanging from the box", "notified", [1, "08:15"], { notifiedAt: at(1, "09:30") });
  open(byS("SL-04-0163"), "Lamp cover broken", "notified", [3, "17:40"], { notifiedAt: at(3, "19:00") });
  open(byS("SL-01-0089"), "Flickering", "photo", [4, "19:05"], {
    notifiedAt: at(4, "20:00"),
    afterPhotoAt: at(0, "07:55"),
    afterPhotoBy: "u_ramesh",
  });
  open(byS("SL-05-0240"), "On in daytime", "photo", [3, "13:10"], {
    notifiedAt: at(3, "15:00"),
    afterPhotoAt: at(1, "16:30"),
    afterPhotoBy: "u_sita",
  });

  // ── notifications & messages ──
  let nn = 0;
  const n = (to: string, x: Omit<Notification, "id" | "to" | "read">, read = false): Notification => ({ id: `n_${++nn}`, to, read, ...x });
  const notifications: Notification[] = [
    n("u_admin", { kind: "repair", icon: "alert", title: "Damage reported: SL-05-0311", body: 'Ward 5 officer: "Not lighting at night"', at: at(0, "09:12"), href: "/admin/repairs" }),
    n("u_admin", { kind: "approval", icon: "lamp", title: "3 new lights to approve", body: "Ramesh K. added lights in Ward 3", at: at(0, "08:40"), href: "/admin/approvals" }),
    n("u_admin", { kind: "repair", icon: "camera", title: "After-photo added: SL-01-0089", body: "Ready to mark repaired", at: at(0, "07:55"), href: "/admin/repairs" }),
    n("u_admin", { kind: "user", icon: "user", title: "New installer sign-up", body: "Nisha R. wants installer access", at: at(0, "06:45"), href: "/admin/users" }),
    n("u_admin", { kind: "user", icon: "user", title: "New installer sign-up", body: "Bikash T. wants installer access", at: at(1, "18:20"), href: "/admin/users" }),
    n("u_admin", { kind: "repair", icon: "check", title: "SL-02-0144 marked repaired", body: "Owner notified · repair count now 1", at: at(2, "16:00") }, true),
    n("u_admin", { kind: "message", icon: "message", title: "Message sent to Ward 4", body: '"Night inspection on Friday"', at: at(3, "17:30") }, true),
    n("u_ramesh", { kind: "repair", icon: "wrench", title: "Repair needed: SL-04-0217", body: 'Ward 4: "Pole leaning after truck hit". Fix, then add the after-photo.', at: at(2, "12:00"), href: "/installer" }),
    n("u_ramesh", { kind: "approval", icon: "check", title: "SL-03-0451 approved", body: "Ward 3 · now live for the ward officer and COA", at: at(5, "10:10"), href: "/light?sno=SL-03-0451" }),
    n("u_ramesh", { kind: "repair", icon: "wrench", title: "Repair needed: SL-04-0163", body: 'Ward 4: "Lamp cover broken". Fix, then add the after-photo.', at: at(3, "19:00"), href: "/installer" }, true),
    n("u_sita", { kind: "repair", icon: "wrench", title: "Repair needed: SL-05-0198", body: 'Ward 5: "Wires hanging from the box". Fix, then add the after-photo.', at: at(1, "09:30"), href: "/installer" }),
    n("u_maya", { kind: "repair", icon: "check", title: "SL-02-0144 marked repaired", body: "Back to working · repair count now 1", at: at(2, "16:00") }),
    n("u_ward2", { kind: "repair", icon: "check", title: "SL-02-0144 marked repaired", body: "Back to working · repair count now 1", at: at(2, "16:00") }),
    n("u_ward4", { kind: "message", icon: "message", title: "Message from Admin", body: "Night inspection on Friday", at: at(3, "17:30") }),
    n("u_ward5", { kind: "message", icon: "message", title: "Message from Admin", body: "Please report any dark poles near the Bus Park before Friday.", at: at(1, "15:00") }),
    n("u_coa", { kind: "message", icon: "message", title: "Message from Admin", body: "November ward reports are ready to export.", at: at(1, "11:00") }),
  ];
  const messages: Message[] = [
    { id: "m_1", from: "u_admin", audience: { type: "ward", ward: 5 }, label: "Ward 5", text: "Please report any dark poles near the Bus Park before Friday.", at: at(1, "15:00") },
    { id: "m_2", from: "u_admin", audience: { type: "role", role: "coa" }, label: "COA", text: "November ward reports are ready to export.", at: at(1, "11:00") },
    { id: "m_3", from: "u_admin", audience: { type: "ward", ward: 4 }, label: "Ward 4", text: "Night inspection on Friday", at: at(3, "17:30") },
  ];

  return { users, lights, repairs, notifications, messages };
}

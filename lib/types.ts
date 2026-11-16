export type Role = "admin" | "installer" | "ward" | "coa";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // demo only — plain text, no backend
  role: Role;
  ward?: number; // ward officers only
  phone?: string;
  status: "active" | "pending";
  createdAt: string;
}

export type LightStatus = "pending" | "working" | "damaged" | "returned";

export interface Light {
  id: string;
  sno: string;
  ward: number;
  lat: number;
  lng: number;
  accuracy: number; // metres
  installedAt: string; // ISO
  ownerId: string; // installer responsible for the light
  addedBy: string;
  status: LightStatus;
  approvedAt?: string;
  photo?: string; // data URL (shrunk)
  repairCount: number;
  returnReason?: string;
  place?: string; // landmark, e.g. "Near Bus Park road"
}

export type RepairStage = "reported" | "notified" | "photo" | "repaired";

export interface Repair {
  id: string;
  lightId: string;
  sno: string;
  ward: number;
  complaint: string;
  note?: string;
  reportedBy: string;
  reportedAt: string;
  stage: RepairStage;
  notifiedAt?: string;
  afterPhoto?: string;
  afterPhotoAt?: string;
  afterPhotoBy?: string;
  repairedAt?: string;
}

export type NotificationKind = "approval" | "repair" | "message" | "user";

export interface Notification {
  id: string;
  to: string;
  kind: NotificationKind;
  icon: "alert" | "lamp" | "camera" | "user" | "check" | "message" | "wrench" | "undo";
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

export type Audience =
  | { type: "all" }
  | { type: "role"; role: Role }
  | { type: "ward"; ward: number }
  | { type: "user"; userId: string };

export interface Message {
  id: string;
  from: string;
  audience: Audience;
  label: string;
  text: string;
  at: string;
}

export interface State {
  users: User[];
  lights: Light[];
  repairs: Repair[];
  notifications: Notification[];
  messages: Message[];
}

export interface NewLight {
  sno: string;
  ward: number;
  lat: number;
  lng: number;
  accuracy: number;
  photo?: string;
  ownerId?: string; // admin adding on behalf of an installer
  installedAt?: string;
}

export type ExportScope =
  | { type: "all" }
  | { type: "ward"; ward: number }
  | { type: "sno"; sno: string };

export interface ExportRow {
  sno: string;
  ward: number;
  lat: number;
  lng: number;
  installedAt: string;
  owner: string;
  condition: string;
  repairCount: number;
  photo?: string;
}

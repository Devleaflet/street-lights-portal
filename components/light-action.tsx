"use client";
import { Camera, Eye, TriangleAlert } from "lucide-react";
import { addAfterPhoto, openRepairFor, resubmitLight } from "@/lib/portal";
import { act } from "@/lib/store";
import type { Light, State, User } from "@/lib/types";
import { RepairAction } from "./admin-desktop";
import { Button, LinkButton } from "./ui";
import { PhotoInput } from "./widgets";

/** The one primary action a role can take on a light's history screen (or null). */
export function LightAction({ data, me, light }: { data: State; me: User; light: Light }) {
  const open = openRepairFor(data, light.id);
  if (me.role === "coa")
    return (
      <p className="flex items-center justify-center gap-2 text-[15px] text-mute">
        <Eye size={18} /> View only
      </p>
    );
  if (me.role === "ward" && !open)
    return (
      <LinkButton href={`/ward/report?sno=${light.sno}`} variant="danger" size="lg" className="w-full">
        <TriangleAlert size={20} /> Report damage
      </LinkButton>
    );
  if (me.role === "ward" && open) return <p className="text-center text-[15px] text-mute">Already reported. You&apos;ll get an update when it&apos;s fixed.</p>;
  if (me.role === "installer" && open?.stage === "notified")
    return (
      <PhotoInput onPhoto={(p) => act((s, m, now) => addAfterPhoto(s, m, open.id, p, now), "After-photo sent to admin")}>
        <span className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-lg font-semibold text-navy-900">
          <Camera size={22} /> Add after-photo
        </span>
      </PhotoInput>
    );
  if (me.role === "installer" && light.status === "returned")
    return (
      <Button variant="dark" size="lg" className="w-full" onClick={() => act((s, m, now) => resubmitLight(s, m, light.id, now), "Resubmitted for approval")}>
        Resubmit for approval
      </Button>
    );
  if (me.role === "admin" && open)
    return (
      <div className="flex [&>*]:w-full [&_button]:h-14 [&_button]:w-full [&_button]:text-lg [&_span]:h-14 [&_span]:w-full [&_span]:justify-center [&_span]:text-lg">
        <RepairAction id={open.id} stage={open.stage} />
      </div>
    );
  if (me.role === "admin" && light.status === "pending")
    return (
      <LinkButton href={`/admin/approvals?id=${light.id}`} variant="ok" size="lg" className="w-full">
        Review approval
      </LinkButton>
    );
  return null;
}

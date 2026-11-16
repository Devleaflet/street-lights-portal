"use client";
import { Download, List, MessageCircle, Plus, Users } from "lucide-react";
import { ProfileScreen, Row } from "@/components/screens";
import { AppShell, usePortal } from "@/components/shell";

export default function Page() {
  return (
    <AppShell roles={["admin"]}>
      <More />
    </AppShell>
  );
}

function More() {
  const { data } = usePortal();
  const signups = data.users.filter((u) => u.status === "pending").length;
  return (
    <ProfileScreen
      extra={
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          <Row icon={Plus} label="Add light" sub="Approved straight away, or on behalf of an installer" href="/add-light" />
          <Row icon={Users} label="Users" sub={signups ? `${signups} installer sign-ups to approve` : "Create ward officer and COA accounts"} href="/admin/users" />
          <Row icon={MessageCircle} label="Messages" sub="Send a note to a ward, a role or a person" href="/admin/messages" />
          <Row icon={Download} label="Exports" sub="Excel by SNO, by ward, or with photos" href="/admin/exports" />
          <Row icon={List} label="All lights" sub={`${data.lights.length} in the system`} href="/admin/lights" />
        </div>
      }
    />
  );
}

"use client";
import { ProfileScreen } from "@/components/screens";
import { AppShell } from "@/components/shell";

export default function Page() {
  return (
    <AppShell roles={["ward"]}>
      <ProfileScreen />
    </AppShell>
  );
}

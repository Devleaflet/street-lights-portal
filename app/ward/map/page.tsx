"use client";
import { MapScreen } from "@/components/screens";
import { AppShell } from "@/components/shell";

export default function Page() {
  return (
    <AppShell roles={["ward"]}>
      <MapScreen />
    </AppShell>
  );
}

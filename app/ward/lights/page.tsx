"use client";
import { Suspense } from "react";
import { LightsBrowser } from "@/components/lights-browser";
import { AppShell } from "@/components/shell";

export default function Page() {
  return (
    <AppShell roles={["ward"]}>
      <Suspense>
        <LightsBrowser />
      </Suspense>
    </AppShell>
  );
}

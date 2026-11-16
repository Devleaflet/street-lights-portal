"use client";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useToasts } from "@/lib/store";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`animate-rise pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
            t.tone === "error" ? "bg-bad-strong text-white" : "bg-navy-900 text-white"
          }`}
        >
          {t.tone === "error" ? <CircleAlert className="mt-px size-4 shrink-0" /> : <CircleCheck className="mt-px size-4 shrink-0 text-brand" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

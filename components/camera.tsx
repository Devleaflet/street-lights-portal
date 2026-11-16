"use client";
import { Camera, CameraOff, ImageIcon, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { demoPhoto, grabFrame } from "@/lib/photo";
import { Button, Sheet } from "./ui";

type Phase = "starting" | "live" | "unavailable";

/** Live camera capture (rear camera on phones). No gallery upload: photos must be taken on site. */
export function CameraSheet({ open, onClose, onPhoto, title = "Take photo", caption = "STREET LIGHT" }: { open: boolean; onClose: () => void; onPhoto: (dataUrl: string) => void; title?: string; caption?: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && <CameraBody onPhoto={(p) => (onPhoto(p), onClose())} caption={caption} />}
    </Sheet>
  );
}

function CameraBody({ onPhoto, caption }: { onPhoto: (p: string) => void; caption: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [why, setWhy] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setWhy("This browser can't open the camera here.");
        return setPhase("unavailable");
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        video.current!.srcObject = stream;
        await video.current!.play();
        setPhase("live");
      } catch (e) {
        const name = (e as DOMException).name;
        setWhy(name === "NotAllowedError" ? "Camera permission was blocked. Allow it in the browser's site settings and try again." : "No camera was found on this device.");
        setPhase("unavailable");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-navy-950 sm:aspect-[4/3]">
        <video ref={video} playsInline muted className={phase === "live" ? "size-full object-cover" : "hidden"} />
        {phase === "starting" && <p className="absolute inset-0 grid place-items-center text-white/70">Opening camera…</p>}
        {phase === "unavailable" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <CameraOff size={40} className="text-white/60" />
            <p className="font-semibold">Camera not available</p>
            <p className="text-sm text-white/70">{why}</p>
          </div>
        )}
        {phase === "live" && (
          <span className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/50" aria-hidden />
        )}
      </div>
      {phase === "live" ? (
        <div className="mt-4 flex items-center justify-center gap-6">
          <span className="size-12" />
          <button type="button" aria-label="Take photo" onClick={() => onPhoto(grabFrame(video.current!))} className="grid size-18 place-items-center rounded-full border-4 border-brand bg-white shadow-lg active:scale-95">
            <Camera size={28} className="text-navy-900" />
          </button>
          <button type="button" aria-label="Switch camera" onClick={() => (setPhase("starting"), setFacing(facing === "environment" ? "user" : "environment"))} className="grid size-12 place-items-center rounded-full bg-canvas hover:bg-line">
            <RefreshCw size={20} />
          </button>
        </div>
      ) : (
        phase === "unavailable" && (
          <div className="mt-4 space-y-2">
            <Button variant="dark" size="lg" className="w-full" onClick={() => onPhoto(demoPhoto(caption))}>
              <ImageIcon size={20} /> Use a demo photo
            </Button>
            <p className="text-center text-sm text-mute">Demo only. The real portal needs a camera photo taken on site.</p>
          </div>
        )
      )}
      <p className="mt-3 text-center text-sm text-mute">Pole and lamp in frame. Photos are shrunk before saving.</p>
    </div>
  );
}

"use client";
// Photos are shrunk before saving (longest side 480 px, JPEG q0.7 ≈ 30–60 KB).
/** Frame from a live <video> → shrunk JPEG data URL (same budget as uploads). */
export function grabFrame(video: HTMLVideoElement, max = 480, quality = 0.7): string {
  const k = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(video.videoWidth * k);
  c.height = Math.round(video.videoHeight * k);
  c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

/** Stand-in photo for devices with no camera (desktop demo). Clearly stamped as a demo. */
export function demoPhoto(caption: string): string {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 360;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, "#1c2840");
  sky.addColorStop(1, "#536079");
  g.fillStyle = sky;
  g.fillRect(0, 0, 480, 360);
  g.fillStyle = "#2b3a57";
  g.fillRect(0, 300, 480, 60);
  const glow = g.createRadialGradient(300, 112, 4, 300, 112, 120);
  glow.addColorStop(0, "rgba(245,184,61,0.9)");
  glow.addColorStop(1, "rgba(245,184,61,0)");
  g.fillStyle = glow;
  g.fillRect(150, 0, 330, 300);
  g.strokeStyle = "#cbd5e1";
  g.lineWidth = 10;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(190, 300);
  g.lineTo(190, 130);
  g.quadraticCurveTo(190, 92, 230, 92);
  g.lineTo(296, 92);
  g.stroke();
  g.fillStyle = "#f5b83d";
  g.fillRect(280, 96, 36, 14);
  g.fillStyle = "rgba(17,26,46,0.75)";
  g.fillRect(12, 12, 236, 30);
  g.fillStyle = "#fff";
  g.font = "600 15px sans-serif";
  g.fillText(`DEMO PHOTO · ${caption}`.slice(0, 30), 22, 33);
  return c.toDataURL("image/jpeg", 0.75);
}

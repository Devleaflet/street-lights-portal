"use client";
import { Camera, LoaderCircle, LocateFixed, ScanLine, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepCard, FixView, captureFix, type Fix } from "@/components/add-light-parts";
import { AppShell, HOME, usePortal } from "@/components/shell";
import { ActionBar, Alert, Button, TaskBar, cx, inputCls } from "@/components/ui";
import { PhotoInput } from "@/components/widgets";
import { addLight, isValidSno, nearestLight, normalizeSno, snoExists, wardFromGps, WARDS } from "@/lib/portal";
import { act, queueLight, toast } from "@/lib/store";

export default function Page() {
  return (
    <AppShell roles={["admin", "installer"]} task>
      <AddLight />
    </AppShell>
  );
}

function AddLight() {
  const { data, me, offline, outbox } = usePortal();
  const router = useRouter();
  const admin = me.role === "admin";
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(false);
  const [sno, setSno] = useState("");
  const [ward, setWard] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [owner, setOwner] = useState("");

  const code = normalizeSno(sno);
  const queued = outbox.some((o) => normalizeSno(o.input.sno) === code);
  const snoState = !code ? "empty" : !isValidSno(code) ? "invalid" : snoExists(data, code) || queued ? "taken" : "ok";
  const suggested = fix ? wardFromGps(fix.lat, fix.lng) : null;
  const done = [!!fix, snoState === "ok", !!ward, !!photo];
  const count = done.filter(Boolean).length;
  const active = done.findIndex((d) => !d);
  const ready = done.every(Boolean); // photo is compulsory for every role
  const near = fix ? nearestLight(data, fix.lat, fix.lng, 10) : undefined;
  const installers = data.users.filter((u) => u.role === "installer" && u.status === "active");

  const locate = async () => {
    setLocating(true);
    const f = await captureFix();
    setLocating(false);
    setFix(f);
    setWard(wardFromGps(f.lat, f.lng));
  };

  const submit = () => {
    if (!fix || !ward) return;
    const input = { sno: code, ward, lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, photo: photo ?? undefined, ownerId: admin && owner ? owner : undefined };
    if (offline && !admin) {
      queueLight(input);
      toast("Saved on this phone. It uploads when the signal is back.");
      return router.push(HOME[me.role]);
    }
    if (act((s, m, now) => addLight(s, m, input, now), admin ? `${code} added and approved` : `${code} sent for approval`)) router.push(admin ? `/light?sno=${code}` : HOME[me.role]);
  };
  const scan = () => toast("Scanning the label needs the camera app in the real build. Type the SNO for this demo.");
  const retake = (
    <PhotoInput onPhoto={setPhoto} caption={code || "NEW LIGHT"} title="Retake photo">
      <span className="px-2 text-[17px] font-semibold text-link">Retake</span>
    </PhotoInput>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:min-h-[calc(100dvh-4rem)]">
      <TaskBar title="Add a light" sub={`Stand under the light · ${count} of 4 done`} close />
      {offline && !admin && (
        <p className="flex items-center gap-2 bg-pend-soft px-4 py-2.5 text-[15px] text-pend-ink">
          <WifiOff size={18} className="shrink-0" /> No signal. Saved on this phone, will upload automatically.
        </p>
      )}
      <div className="grid flex-1 content-start gap-3 px-4 py-4 lg:grid-cols-2 lg:gap-4 lg:px-8 lg:py-6">
        <StepCard
          n={1}
          done={done[0]}
          active={active === 0}
          title="Location"
          right={
            fix && (
              <button type="button" onClick={locate} className="h-10 px-2 text-[17px] font-semibold text-link">
                Retake
              </button>
            )
          }
        >
          {fix ? (
            <FixView data={data} fix={fix} />
          ) : (
            <Button variant="dark" size="lg" className="w-full" onClick={locate} disabled={locating}>
              {locating ? <LoaderCircle className="animate-spin" size={22} /> : <LocateFixed size={22} />} {locating ? "Getting GPS fix…" : "Capture GPS"}
            </Button>
          )}
          {near && (
            <Alert className="mt-3">
              Another light, <b>{near.light.sno}</b>, is {near.metres} m away. Check this isn&apos;t the same pole.
            </Alert>
          )}
        </StepCard>

        <StepCard n={2} done={done[1]} active={active === 1} title="Serial number (SNO)">
          <div className="flex gap-3">
            <input
              value={sno}
              onChange={(e) => setSno(e.target.value.toUpperCase())}
              placeholder="e.g. SL-03-0459"
              aria-label="Serial number"
              autoCapitalize="characters"
              autoComplete="off"
              className={cx(inputCls, "h-14 font-display text-xl font-bold tracking-wide", snoState === "ok" && "border-ok", snoState === "taken" && "border-bad")}
            />
            <button type="button" aria-label="Scan SNO label" onClick={scan} className="grid size-14 shrink-0 place-items-center rounded-xl border border-line hover:bg-canvas">
              <ScanLine size={24} />
            </button>
          </div>
          <p aria-live="polite" className={cx("mt-2 text-[15px] font-medium", snoState === "ok" ? "text-ok" : "text-bad-ink")}>
            {snoState === "ok" && "✓ New SNO, not in the system yet"}
            {snoState === "taken" && `✗ ${code} is already in the system`}
            {snoState === "invalid" && "Use the letters, numbers and dashes printed on the light"}
          </p>
        </StepCard>

        <StepCard n={3} done={done[2]} active={active === 2} title="Ward" right={suggested && ward === suggested ? <span className="text-[15px] text-mute">Suggested from GPS</span> : undefined}>
          <div className="grid grid-cols-9 gap-1.5" role="radiogroup" aria-label="Ward">
            {WARDS.map((w) => (
              <button key={w} type="button" role="radio" aria-checked={ward === w} onClick={() => setWard(w)} className={cx("h-14 rounded-xl border text-lg", ward === w ? "border-navy-900 bg-navy-900 font-bold text-white" : "border-line bg-white hover:border-pend")}>
                {w}
              </button>
            ))}
          </div>
        </StepCard>

        <StepCard n={4} done={done[3]} active={active === 3} title="Photo of the light" right={photo ? retake : undefined}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Photo of the new light" className="aspect-[4/3] w-full rounded-xl object-cover" />
          ) : (
            <PhotoInput onPhoto={setPhoto} caption={code || "NEW LIGHT"} title="Photo of the light" className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line bg-canvas/60 py-6 hover:bg-canvas">
              <Camera size={32} />
              <span className="text-lg font-semibold">Take photo</span>
              <span className="text-[15px] text-mute">Opens the camera · pole and lamp in frame</span>
            </PhotoInput>
          )}
        </StepCard>

        {admin && (
          <section className="rounded-2xl border border-line bg-white p-4">
            <label className="block">
              <span className="mb-1.5 block text-lg font-semibold">Owner</span>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
                <option value="">Admin (me)</option>
                {installers.map((u) => (
                  <option key={u.id} value={u.id}>
                    On behalf of {u.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-sm text-mute">Lights added by the admin are approved straight away.</p>
          </section>
        )}
      </div>
      <ActionBar>
        <Button variant={admin ? "brand" : "dark"} size="lg" disabled={!ready} onClick={submit}>
          {admin ? "Add light" : offline ? "Save on this phone" : "Submit for approval"}
        </Button>
      </ActionBar>
    </div>
  );
}

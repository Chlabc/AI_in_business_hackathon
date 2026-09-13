"use client";

import { useId, useState } from "react";
import Image from "next/image";
import colors from "./coach.module.css";

type Props = {
  repId: string;
  agency: string;
  name: string;
  role: string;
  weeksInRole: number;
  weakestStage: string;
  attemptCount: number;
};

export function EmployeeCredential({
  repId,
  agency,
  name,
  role,
  weeksInRole,
  weakestStage,
  attemptCount,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);
  // Match the existing seeded rep identity, never a custom session display name.
  // Manual §6: the portrait needs BOTH the seeded rep AND the canonical display
  // name. A custom login (e.g. "Huey") reuses Alex's seeded calls, so the repId
  // check alone would put Alex's face beside someone else's name.
  const portraitSrc =
    repId === "rep_demo_alex" && name.trim().toLowerCase() === "alex chen"
      ? "/alex-chen.png"
      : null;
  const id = useId();
  const frontId = `${id}-front`;
  const backId = `${id}-back`;

  return (
    <div className={colors.credential}>
      <button
        type="button"
        className={colors.credentialControl}
        onClick={() => setFlipped((visible) => !visible)}
        aria-label={
          flipped
            ? `Show ${name}'s employee identity`
            : `Show ${name}'s coaching summary`
        }
        aria-describedby={flipped ? backId : frontId}
      />
      <div
        className={`${colors.credentialRotor} ${flipped ? colors.credentialFlipped : ""}`}
      >
        <div
          id={frontId}
          aria-hidden={flipped}
          className={`${colors.repProfile} ${colors.credentialFace}`}
        >
          <div className={colors.employeeCompany}>
            <p className="text-base font-semibold tracking-tight text-accent">
              {agency}
            </p>
            <span className="text-[10px] font-semibold tracking-widest text-muted">
              STAFF
            </span>
          </div>
          <div className={colors.employeeIdentity}>
            <span className={colors.employeePortrait}>
              {!portraitSrc || portraitFailed ? (
                <span aria-hidden="true">
                  {name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              ) : (
                <Image
                  src={portraitSrc}
                  alt="Alex Chen"
                  fill
                  sizes="(max-width: 1023px) 112px, 180px"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                  onError={() => setPortraitFailed(true)}
                />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                {name}
              </p>
              <p className="mt-1 text-sm text-muted">{role}</p>
              <dl className="mt-3">
                <dt className="text-xs text-muted">Time in role</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {weeksInRole} weeks
                </dd>
              </dl>
              <dl className="mt-2">
                <dt className="text-xs text-muted">Current coaching focus</dt>
                <dd className="mt-1 inline-flex rounded-md border border-accent/20 bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                  Price concessions
                </dd>
              </dl>
            </div>
          </div>
          <p className="text-right text-[10px] text-muted">Tap to flip ↔</p>
        </div>
        <div
          id={backId}
          aria-hidden={!flipped}
          className={`${colors.repProfile} ${colors.credentialFace} ${colors.credentialBack}`}
        >
          <div className={colors.employeeCompany}>
            <p className="text-base font-semibold text-accent">{agency}</p>
            <span className="text-[10px] font-semibold tracking-widest text-muted">
              COACHING
            </span>
          </div>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Current coaching focus</dt>
              <dd className="mt-1 font-medium text-accent">
                Price concessions
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Weakest diagnosed stage</dt>
              <dd className="mt-1 font-semibold capitalize text-foreground">
                {weakestStage}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Practice attempts</dt>
              <dd className="mt-1 font-medium text-foreground">
                {attemptCount === 0 ? "No scored drills yet" : attemptCount}
              </dd>
            </div>
          </dl>
          <p className="text-right text-[10px] text-muted">Tap to return ↔</p>
        </div>
      </div>
    </div>
  );
}

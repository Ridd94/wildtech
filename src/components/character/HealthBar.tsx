// src/components/character/HealthBar.tsx
"use client";

import React from "react";

type Props = {
  current: number;
  max: number;
  label?: string;
};

export default function HealthBar({ current, max, label = "HP" }: Props) {
  const safeMax = Math.max(1, max);
  const safeCur = Math.max(0, Math.min(current, safeMax));
  const pct = Math.round((safeCur / safeMax) * 100);

  return (
    <div className="tile">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs opacity-80 tabular-nums">
          {safeCur} / {safeMax}
        </div>
      </div>

      <div className="mt-3 h-3 w-full rounded-full border border-white/10 bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, rgba(0,255,255,0.85), rgba(255,0,200,0.70))",
            boxShadow:
              "0 0 18px rgba(0,255,255,0.18), 0 0 22px rgba(255,0,200,0.12)",
          }}
        />
      </div>

      <div className="mt-2 text-xs opacity-70">
        Live bar for testing (combat will drive HP later).
      </div>
    </div>
  );
}
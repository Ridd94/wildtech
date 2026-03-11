// src/components/character/StatPill.tsx
"use client";

import React from "react";
import { formatSigned } from "@/lib/game/character";

type Props = {
  label: string;
  code: string;
  value: number;
  hint?: string;
};

export default function StatPill({ label, code, value, hint }: Props) {
  return (
    <div
      className="tile"
      title={hint ?? ""}
      aria-label={`${label} (${code}) ${value}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest opacity-80">
            {code}
          </div>
          <div className="text-sm font-semibold truncate">{label}</div>
        </div>

        <div className="text-lg font-bold tabular-nums">
          {formatSigned(value)}
        </div>
      </div>
    </div>
  );
}
// src/components/character/SectionCard.tsx
"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

export default function SectionCard({ title, subtitle, right, children }: Props) {
  return (
    <section className="wt-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-extrabold tracking-wide">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm opacity-70">{subtitle}</div>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}
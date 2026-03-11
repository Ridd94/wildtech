// src/app/layout.tsx

import "./globals.css";
import React from "react";
import TopNav from "@/components/nav/TopNav";

export const metadata = {
  title: "WildTech",
  description: "Cyberpunk RPG system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Global live background */}
        <div className="wt-live-bg" />
        <div className="wt-noise" />

        {/* App chrome */}
        <TopNav />

        {/* All app content above background */}
        <div className="wt-content">
          <div className="wt-appFrame">{children}</div>
        </div>
      </body>
    </html>
  );
}
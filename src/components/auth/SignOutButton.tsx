"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function SignOutButton() {
  return (
    <button className="btn" onClick={() => signOut(auth)}>
      Sign out
    </button>
  );
}
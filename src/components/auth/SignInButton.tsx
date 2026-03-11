"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, ensureAuthPersistence } from "@/lib/firebase/client";

export default function SignInButton() {
  return (
    <button
      className="btn btn-primary"
      onClick={async () => {
        if (auth.currentUser) return;

        await ensureAuthPersistence();

        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }}
    >
      Sign in with Google
    </button>
  );
}
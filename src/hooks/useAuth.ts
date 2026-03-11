"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, ensureAuthPersistence } from "@/lib/firebase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await ensureAuthPersistence();
      } catch (e) {
        console.error("[auth] persistence error:", e);
      }

      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });

      return () => unsub();
    })();
  }, []);

  return { user, loading };
}
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db = getFirestore(app);

// We MUST await persistence before redirect sign-in, otherwise the session may not stick.
let persistencePromise: Promise<void> | null = null;

export function ensureAuthPersistence() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch(
      (err) => {
        console.error("[firebase] setPersistence failed:", err);
        // Re-throw so callers can see it if needed
        throw err;
      }
    );
  }
  return persistencePromise;
}
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from "@/lib/firebase-client";
import { mapUser, type DirectoryUser } from "@/lib/directory";

type AuthValue = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  profile: DirectoryUser | null;
  signIn: (email: string, password: string, keep: boolean) => Promise<string | null>;
  signOutUser: () => Promise<void>;
  getToken: () => Promise<string>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DirectoryUser | null>(null);

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(firebaseAuth(), (next) => {
      setUser(next);
      setReady(true);
    });
  }, [configured]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    return onSnapshot(doc(firebaseDb(), "users", user.uid), (snap) => {
      setProfile(snap.exists() ? mapUser(snap.id, snap.data()) : null);
    });
  }, [user]);

  async function signIn(email: string, password: string, keep: boolean) {
    if (!configured) return "auth.notConfigured";
    const auth = firebaseAuth();
    try {
      await setPersistence(auth, keep ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(firebaseDb(), "users", credential.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        return "auth.notInDirectory";
      }
      const nextProfile = mapUser(snap.id, snap.data());
      if (nextProfile.status === "disabled") {
        await signOut(auth);
        return "auth.disabled";
      }
      try {
        await updateDoc(doc(firebaseDb(), "users", credential.user.uid), { lastActiveAt: serverTimestamp() });
      } catch {
        // The directory write can lag behind a new rules deploy. Sign-in still stands.
      }
      return null;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-email") {
        return "auth.invalid";
      }
      if (code === "auth/user-disabled") return "auth.disabled";
      return "auth.failed";
    }
  }

  async function signOutUser() {
    if (configured) await signOut(firebaseAuth());
  }

  async function getToken() {
    const current = firebaseAuth().currentUser;
    if (!current) throw new Error("unauthenticated");
    return current.getIdToken();
  }

  return <AuthContext.Provider value={{ ready, configured, user, profile, signIn, signOutUser, getToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

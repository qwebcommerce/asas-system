"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { firebaseDb } from "@/lib/firebase-client";
import { mapRequest, mapUser, type AccessRequest, type DirectoryUser } from "@/lib/directory";

export function useDirectory() {
  const { user, profile, configured } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile) {
      setUsers([]);
      setRequests([]);
      setReady(Boolean(configured && !user));
      return;
    }

    const db = firebaseDb();
    const usersUnsub =
      profile.role === "superAdmin"
        ? onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map((item) => mapUser(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name)));
            setReady(true);
          })
        : null;
    if (!usersUnsub) {
      setUsers([profile]);
      setReady(true);
    }

    const requestsQuery =
      profile.role === "superAdmin"
        ? query(collection(db, "accessRequests"), where("status", "==", "pending"))
        : query(collection(db, "accessRequests"), where("userId", "==", user.uid));

    const requestsUnsub = onSnapshot(requestsQuery, (snap) => {
      setRequests(
        snap.docs
          .map((item) => mapRequest(item.id, item.data()))
          .filter((item): item is AccessRequest => item !== null && item.status === "pending"),
      );
    });

    return () => {
      usersUnsub?.();
      requestsUnsub();
    };
  }, [configured, user, profile]);

  return { users, requests, ready };
}

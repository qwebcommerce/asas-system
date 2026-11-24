"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canReadAll } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapWeekly, type WeeklyReport } from "@/lib/weekly";

/** Live weekly project reports (people who read all project reports). Super Admins approve them. */
export function useWeekly() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const canView = canReadAll(level("reports"));
  const canApprove = profile?.role === "superAdmin";
  const active = Boolean(configured && user && profile && accessReady && canView);
  const [weekly, setWeekly] = useState<WeeklyReport[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active) return;
    return onSnapshot(
      collection(firebaseDb(), "weeklyReports"),
      (snap) => {
        setWeekly(snap.docs.flatMap((doc) => mapWeekly(doc.id, doc.data()) ?? []));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [active]);

  const sorted = (active ? weekly : []).slice().sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.projectEn.localeCompare(b.projectEn));
  return { weekly: sorted, ready: Boolean(accessReady) && (!active || loaded), canView, canApprove };
}

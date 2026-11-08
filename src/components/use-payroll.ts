"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { firebaseDb } from "@/lib/firebase-client";
import { mapPayrollRun, type PayrollRun } from "@/lib/payroll";

export function usePayroll() {
  const { user, profile, configured } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [ready, setReady] = useState(false);
  const canView = profile?.role === "superAdmin" || profile?.role === "accountant" || profile?.role === "hr";
  const canManage = profile?.role === "superAdmin" || profile?.role === "accountant";
  const canApprove = profile?.role === "superAdmin";

  useEffect(() => {
    if (!configured || !user || !profile) {
      setRuns([]);
      setReady(Boolean(configured && !user));
      return;
    }
    if (profile.role !== "superAdmin" && profile.role !== "accountant" && profile.role !== "hr") {
      setRuns([]);
      setReady(true);
      return;
    }
    const unsubscribe = onSnapshot(collection(firebaseDb(), "payrollRuns"), (snap) => {
      setRuns(snap.docs.flatMap((item) => {
        const run = mapPayrollRun(item.id, item.data());
        return run ? [run] : [];
      }).sort((a, b) => b.month.localeCompare(a.month)));
      setReady(true);
    }, () => setReady(true));
    return unsubscribe;
  }, [configured, profile, user]);

  return { runs, ready, canView, canManage, canApprove };
}

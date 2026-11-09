"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canReadAll, canWriteModule } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapPayrollRun, type PayrollRun } from "@/lib/payroll";

export function usePayroll() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const payrollLevel = level("payroll");
  const canView = canReadAll(payrollLevel);
  const canManage = canWriteModule(payrollLevel);
  const canApprove = profile?.role === "superAdmin" || payrollLevel === "approve";
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile || !accessReady || !canView) {
      setRuns([]);
      setReady(Boolean(configured && (!user || (profile && accessReady && !canView))));
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
  }, [accessReady, canView, configured, profile, user]);

  return { runs, ready, canView, canManage, canApprove };
}

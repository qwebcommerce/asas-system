"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { firebaseDb } from "@/lib/firebase-client";
import { mapProjectReport, mapReportFile, type ProjectReport, type ReportFile } from "@/lib/reports";

export function useReports() {
  const { user, profile, configured } = useAuth();
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [files, setFiles] = useState<ReportFile[]>([]);
  const [ready, setReady] = useState(false);
  const canManage = profile?.role === "superAdmin" || profile?.role === "engineer";
  const canView = canManage || profile?.role === "accountant";

  useEffect(() => {
    if (!configured || !user || !profile || !canView) {
      setReports([]);
      setFiles([]);
      setReady(Boolean(configured && (!user || (profile && !canView))));
      return;
    }
    const db = firebaseDb();
    const reportsUnsub = onSnapshot(collection(db, "projectReports"), (snap) => {
      setReports(snap.docs.flatMap((item) => {
        const report = mapProjectReport(item.id, item.data());
        return report ? [report] : [];
      }));
      setReady(true);
    }, () => setReady(true));
    const filesUnsub = onSnapshot(collection(db, "reportFiles"), (snap) => {
      setFiles(snap.docs.flatMap((item) => {
        const file = mapReportFile(item.id, item.data());
        return file ? [file] : [];
      }));
    });
    return () => {
      reportsUnsub();
      filesUnsub();
    };
  }, [canView, configured, profile, user]);

  return { reports, files, ready, canManage, canView };
}

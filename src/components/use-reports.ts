"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canOpenModule, canReadAll, canWriteModule, seesOwn } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapProjectReport, mapReportFile, type ProjectReport, type ReportFile } from "@/lib/reports";

export function useReports() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const reportsLevel = level("reports");
  const canView = canOpenModule(reportsLevel);
  const canManage = canWriteModule(reportsLevel) || seesOwn(reportsLevel);
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [files, setFiles] = useState<ReportFile[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile || !accessReady || !canView) {
      setReports([]);
      setFiles([]);
      setReady(Boolean(configured && (!user || (profile && accessReady && !canView))));
      return;
    }
    const db = firebaseDb();
    const reportRows = collection(db, "projectReports");
    const fileRows = collection(db, "reportFiles");
    const reportsQuery = canReadAll(reportsLevel) ? reportRows : query(reportRows, where("createdBy", "==", user.uid));
    const filesQuery = canReadAll(reportsLevel) ? fileRows : query(fileRows, where("createdBy", "==", user.uid));
    const reportsUnsub = onSnapshot(reportsQuery, (snap) => {
      setReports(snap.docs.flatMap((item) => {
        const report = mapProjectReport(item.id, item.data());
        return report ? [report] : [];
      }));
      setReady(true);
    }, () => setReady(true));
    const filesUnsub = onSnapshot(filesQuery, (snap) => {
      setFiles(snap.docs.flatMap((item) => {
        const file = mapReportFile(item.id, item.data());
        return file ? [file] : [];
      }));
    });
    return () => {
      reportsUnsub();
      filesUnsub();
    };
  }, [accessReady, canView, configured, profile, reportsLevel, user]);

  return { reports, files, ready, canManage, canView };
}

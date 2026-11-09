"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canOpenModule, canReadAll, canWriteModule } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapApplicant, mapAttendance, mapEmployee, mapEmployeeFile, mapHrDocument, mapJob, mapLeave, mapReport, qatarToday, type Applicant, type AttendanceReport, type AttendanceStatus, type Employee, type EmployeeFile, type HrDocument, type JobPost, type LeaveRequest } from "@/lib/hr";

export function useHr() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const hrLevel = level("hr");
  const canManage = canWriteModule(hrLevel);
  const canViewAll = canReadAll(hrLevel);
  const canOpen = canOpenModule(hrLevel);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [files, setFiles] = useState<EmployeeFile[]>([]);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [today, setToday] = useState<Record<string, AttendanceStatus>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile || !accessReady || !canOpen) {
      setEmployees([]);
      setLeaves([]);
      setJobs([]);
      setApplicants([]);
      setDocuments([]);
      setFiles([]);
      setReports([]);
      setToday({});
      setReady(Boolean(configured && (!user || (profile && accessReady && !canOpen))));
      return;
    }

    const db = firebaseDb();
    const viewAll = canViewAll;
    const employeesQuery = viewAll ? collection(db, "employees") : query(collection(db, "employees"), where("userId", "==", user.uid));
    const leavesQuery = viewAll ? collection(db, "leaveRequests") : query(collection(db, "leaveRequests"), where("userId", "==", user.uid));
    const date = qatarToday();
    const marksQuery = viewAll
      ? query(collection(db, "attendanceMarks"), where("date", "==", date))
      : query(collection(db, "attendanceMarks"), where("userId", "==", user.uid));
    const filesQuery = viewAll ? collection(db, "employeeFiles") : query(collection(db, "employeeFiles"), where("userId", "==", user.uid));
    const unsubscribers = [
      onSnapshot(employeesQuery, (snap) => {
        setEmployees(snap.docs.map((item) => mapEmployee(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name)));
        setReady(true);
      }),
      onSnapshot(leavesQuery, (snap) => {
        setLeaves(snap.docs.map((item) => mapLeave(item.id, item.data())).filter((item): item is LeaveRequest => item !== null));
      }),
      onSnapshot(marksQuery, (snap) => {
        const next: Record<string, AttendanceStatus> = {};
        snap.docs.forEach((item) => {
          const data = item.data();
          if (data.date !== date) return;
          const mark = mapAttendance(data);
          if (mark) next[mark.employeeId] = mark.status;
        });
        setToday(next);
      }),
      onSnapshot(filesQuery, (snap) => {
        setFiles(snap.docs.map((item) => mapEmployeeFile(item.id, item.data())).filter((item): item is EmployeeFile => item !== null));
      }),
    ];

    if (viewAll) {
      unsubscribers.push(
        onSnapshot(collection(db, "jobs"), (snap) => {
          setJobs(snap.docs.map((item) => mapJob(item.id, item.data())).filter((item): item is JobPost => item !== null));
        }),
        onSnapshot(collection(db, "applicants"), (snap) => {
          setApplicants(snap.docs.map((item) => mapApplicant(item.id, item.data())).filter((item): item is Applicant => item !== null));
        }),
        onSnapshot(collection(db, "hrDocuments"), (snap) => {
          setDocuments(snap.docs.map((item) => mapHrDocument(item.id, item.data())).filter((item): item is HrDocument => item !== null));
        }),
        onSnapshot(collection(db, "attendanceReports"), (snap) => {
          setReports(snap.docs.map((item) => mapReport(item.id, item.data())));
        }),
      );
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [accessReady, canOpen, canViewAll, configured, profile, user]);

  return { employees, leaves, jobs, applicants, documents, files, reports, today, ready, canManage, canViewAll, canOpen };
}

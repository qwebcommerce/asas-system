"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { firebaseDb } from "@/lib/firebase-client";
import { mapApplicant, mapEmployee, mapHrDocument, mapJob, mapLeave, mapReport, type Applicant, type AttendanceReport, type Employee, type HrDocument, type JobPost, type LeaveRequest } from "@/lib/hr";

export function useHr() {
  const { user, profile, configured } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [ready, setReady] = useState(false);
  const canManage = profile?.role === "superAdmin" || profile?.role === "hr";
  const canViewAll = canManage || profile?.role === "accountant";

  useEffect(() => {
    if (!configured || !user || !profile) {
      setEmployees([]);
      setLeaves([]);
      setJobs([]);
      setApplicants([]);
      setDocuments([]);
      setReports([]);
      setReady(Boolean(configured && !user));
      return;
    }

    const db = firebaseDb();
    const viewAll = profile.role === "superAdmin" || profile.role === "hr" || profile.role === "accountant";
    const employeesQuery = viewAll ? collection(db, "employees") : query(collection(db, "employees"), where("userId", "==", user.uid));
    const leavesQuery = viewAll ? collection(db, "leaveRequests") : query(collection(db, "leaveRequests"), where("userId", "==", user.uid));
    const unsubscribers = [
      onSnapshot(employeesQuery, (snap) => {
        setEmployees(snap.docs.map((item) => mapEmployee(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name)));
        setReady(true);
      }),
      onSnapshot(leavesQuery, (snap) => {
        setLeaves(snap.docs.map((item) => mapLeave(item.id, item.data())).filter((item): item is LeaveRequest => item !== null));
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
  }, [configured, profile, user]);

  return { employees, leaves, jobs, applicants, documents, reports, ready, canManage, canViewAll };
}

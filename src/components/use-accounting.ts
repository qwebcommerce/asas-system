"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { mapBill, mapBudget, mapCheque, mapExpense, mapInvoice, type Bill, type Budget, type Cheque, type Expense, type Invoice } from "@/lib/accounting";
import { firebaseDb } from "@/lib/firebase-client";

export function useAccounting() {
  const { user, profile, configured } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ready, setReady] = useState(false);
  const canManage = profile?.role === "superAdmin" || profile?.role === "accountant";

  useEffect(() => {
    if (!configured || !user || !profile || !canManage) {
      setInvoices([]);
      setBills([]);
      setCheques([]);
      setBudgets([]);
      setExpenses([]);
      setReady(Boolean(configured && (!user || (profile && !canManage))));
      return;
    }
    const db = firebaseDb();
    const listen = <T,>(name: string, map: (id: string, data: Record<string, unknown>) => T | null, set: (rows: T[]) => void, markReady?: boolean) => onSnapshot(collection(db, name), (snap) => {
      set(snap.docs.flatMap((item) => {
        const row = map(item.id, item.data());
        return row ? [row] : [];
      }));
      if (markReady) setReady(true);
    }, () => {
      if (markReady) setReady(true);
    });
    const unsubscribers = [
      listen("invoices", mapInvoice, setInvoices, true),
      listen("bills", mapBill, setBills),
      listen("cheques", mapCheque, setCheques),
      listen("budgets", mapBudget, setBudgets),
      listen("expenses", mapExpense, setExpenses),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [canManage, configured, profile, user]);

  return { invoices, bills, cheques, budgets, expenses, ready, canManage };
}

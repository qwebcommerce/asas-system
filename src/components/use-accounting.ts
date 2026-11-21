"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canReadAll, canWriteModule } from "@/lib/access";
import { mapBill, mapExpense, mapInvoice, mapReceipt, type Bill, type Expense, type Invoice, type Receipt } from "@/lib/accounting";
import { firebaseDb } from "@/lib/firebase-client";

export function useAccounting() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const accountingLevel = level("accounting");
  const canView = canReadAll(accountingLevel);
  const canManage = canWriteModule(accountingLevel);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile || !accessReady || !canView) {
      setInvoices([]);
      setBills([]);
      setExpenses([]);
      setReceipts([]);
      setReady(Boolean(configured && (!user || (profile && accessReady && !canView))));
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
      listen("expenses", mapExpense, setExpenses),
      listen("receipts", mapReceipt, setReceipts),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [accessReady, canView, configured, profile, user]);

  return { invoices, bills, expenses, receipts, ready, canView, canManage };
}

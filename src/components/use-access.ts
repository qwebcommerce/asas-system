"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { defaultMatrix, mapBank, mapMatrix, type BankAccount, type RoleMatrix } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";

export function useAccessAdmin(enabled: boolean) {
  const { configured } = useAuth();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [matrix, setMatrix] = useState<RoleMatrix>(defaultMatrix);

  useEffect(() => {
    if (!enabled || !configured) {
      setBanks([]);
      setMatrix(defaultMatrix);
      return;
    }
    const db = firebaseDb();
    const banksUnsub = onSnapshot(collection(db, "bankAccounts"), (snap) => {
      setBanks(snap.docs.map((item) => mapBank(item.id, item.data())).filter((item): item is BankAccount => item !== null).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const matrixUnsub = onSnapshot(doc(db, "settings", "roleMatrix"), (snap) => {
      setMatrix(mapMatrix(snap.exists() ? snap.data() : undefined));
    });
    return () => {
      banksUnsub();
      matrixUnsub();
    };
  }, [configured, enabled]);

  return { banks, matrix };
}

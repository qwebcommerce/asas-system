"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { defaultMatrix, mapMatrix, type RoleMatrix } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";

export function useAccessAdmin(enabled: boolean) {
  const { configured } = useAuth();
  const [matrix, setMatrix] = useState<RoleMatrix>(defaultMatrix);

  useEffect(() => {
    if (!enabled || !configured) {
      setMatrix(defaultMatrix);
      return;
    }
    const matrixUnsub = onSnapshot(doc(firebaseDb(), "settings", "roleMatrix"), (snap) => {
      setMatrix(mapMatrix(snap.exists() ? snap.data() : undefined));
    });
    return () => matrixUnsub();
  }, [configured, enabled]);

  return { matrix };
}

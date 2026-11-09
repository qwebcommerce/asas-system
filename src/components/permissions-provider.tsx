"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { defaultMatrix, mapMatrix, roleLevel, type MatrixModule, type PermissionLevel, type RoleMatrix } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";

type Permissions = {
  ready: boolean;
  matrix: RoleMatrix;
  level: (module: MatrixModule) => PermissionLevel;
};

const PermissionsContext = createContext<Permissions>({
  ready: false,
  matrix: defaultMatrix,
  level: () => "none",
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, configured } = useAuth();
  const [matrix, setMatrix] = useState<RoleMatrix>(defaultMatrix);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile) {
      setMatrix(defaultMatrix);
      setReady(Boolean(configured && !user));
      return;
    }
    return onSnapshot(doc(firebaseDb(), "settings", "roleMatrix"), (snap) => {
      setMatrix(mapMatrix(snap.exists() ? snap.data() : undefined));
      setReady(true);
    }, () => {
      setMatrix(defaultMatrix);
      setReady(true);
    });
  }, [configured, profile, user]);

  const value = useMemo<Permissions>(() => ({
    ready,
    matrix,
    level: (module) => roleLevel(matrix, profile?.role ?? "", module),
  }), [matrix, profile?.role, ready]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

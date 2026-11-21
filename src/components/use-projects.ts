"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canReadAll, canWriteModule } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapProject, type Project } from "@/lib/projects";

/** Live list of projects (needs the Projects permission to read). */
export function useProjects() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const projectsLevel = level("projects");
  const canView = canReadAll(projectsLevel);
  const canManage = canWriteModule(projectsLevel);
  const active = Boolean(configured && user && profile && accessReady && canView);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active) return;
    return onSnapshot(
      collection(firebaseDb(), "projects"),
      (snap) => {
        setProjects(snap.docs.flatMap((doc) => mapProject(doc.id, doc.data()) ?? []));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [active]);

  const sorted = (active ? projects : []).slice().sort((a, b) => b.code.localeCompare(a.code));
  return { projects: sorted, ready: Boolean(accessReady) && (!active || loaded), canView, canManage };
}

"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canOpenModule, canReadAll, canWriteModule, seesOwn } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { documentTitle, isExpiringSoon, mapLibraryDocument, type LibraryDocument } from "@/lib/documents";

export function useDocuments() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const documentsLevel = level("documents");
  const canView = canOpenModule(documentsLevel);
  const canCreate = canWriteModule(documentsLevel) || seesOwn(documentsLevel);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile || !accessReady) {
      setDocuments([]);
      setReady(Boolean(configured && !user));
      return;
    }
    if (!canView) {
      setDocuments([]);
      setReady(true);
      return;
    }
    const rows = collection(firebaseDb(), "libraryDocuments");
    const source = canReadAll(documentsLevel) ? rows : query(rows, where("createdBy", "==", user.uid));
    return onSnapshot(source, (snap) => {
      setDocuments(snap.docs.flatMap((item) => {
        const document = mapLibraryDocument(item.id, item.data());
        return document ? [document] : [];
      }));
      setReady(true);
    }, () => setReady(true));
  }, [accessReady, canView, configured, documentsLevel, profile, user]);

  const expiring = documents.filter((item) => item.hasExpiry && isExpiringSoon(item.expiresOn));
  function canEdit(document: LibraryDocument) {
    if (canWriteModule(documentsLevel)) return true;
    return seesOwn(documentsLevel) && document.createdBy === profile?.id;
  }

  return { documents, expiring, ready, canView, canCreate, canEdit, profile };
}

export function sortDocuments(documents: LibraryDocument[], locale: string) {
  return [...documents].sort((a, b) => documentTitle(a, locale).localeCompare(documentTitle(b, locale)));
}

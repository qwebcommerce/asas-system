"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { firebaseDb } from "@/lib/firebase-client";
import { documentTitle, isExpiringSoon, mapLibraryDocument, type LibraryDocument } from "@/lib/documents";

export function useDocuments() {
  const { user, profile, configured } = useAuth();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile) {
      setDocuments([]);
      setReady(Boolean(configured && !user));
      return;
    }
    const unsubscribe = onSnapshot(collection(firebaseDb(), "libraryDocuments"), (snap) => {
      setDocuments(snap.docs.flatMap((item) => {
        const document = mapLibraryDocument(item.id, item.data());
        return document ? [document] : [];
      }));
      setReady(true);
    }, () => setReady(true));
    return unsubscribe;
  }, [configured, profile, user]);

  const expiring = documents.filter((item) => item.hasExpiry && isExpiringSoon(item.expiresOn));
  function canEdit(document: LibraryDocument) {
    return profile?.role === "superAdmin" || document.createdBy === profile?.id;
  }

  return { documents, expiring, ready, canEdit, profile };
}

export function sortDocuments(documents: LibraryDocument[], locale: string) {
  return [...documents].sort((a, b) => documentTitle(a, locale).localeCompare(documentTitle(b, locale)));
}

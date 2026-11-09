"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canOpenModule, canReadAll, canWriteModule, seesOwn } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapOffer, type Offer } from "@/lib/offers";

export function useOffers() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const offersLevel = level("offers");
  const canView = canOpenModule(offersLevel);
  const canManage = canWriteModule(offersLevel) || seesOwn(offersLevel);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user || !profile || !accessReady || !canView) {
      setOffers([]);
      setReady(Boolean(configured && (!user || (profile && accessReady && !canView))));
      return;
    }
    const rows = collection(firebaseDb(), "offers");
    const source = canReadAll(offersLevel) ? rows : query(rows, where("createdBy", "==", user.uid));
    return onSnapshot(source, (snap) => {
      setOffers(snap.docs.flatMap((item) => {
        const offer = mapOffer(item.id, item.data());
        return offer ? [offer] : [];
      }));
      setReady(true);
    }, () => setReady(true));
  }, [accessReady, canView, configured, offersLevel, profile, user]);

  return { offers, ready, canManage, canView };
}

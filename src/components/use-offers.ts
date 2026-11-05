"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { firebaseDb } from "@/lib/firebase-client";
import { mapOffer, type Offer } from "@/lib/offers";

export function useOffers() {
  const { user, profile, configured } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ready, setReady] = useState(false);
  const canManage = profile?.role === "superAdmin" || profile?.role === "engineer";
  const canView = canManage || profile?.role === "accountant";

  useEffect(() => {
    if (!configured || !user || !profile || !canView) {
      setOffers([]);
      setReady(Boolean(configured && (!user || (profile && !canView))));
      return;
    }
    return onSnapshot(collection(firebaseDb(), "offers"), (snap) => {
      setOffers(snap.docs.flatMap((item) => {
        const offer = mapOffer(item.id, item.data());
        return offer ? [offer] : [];
      }));
      setReady(true);
    }, () => setReady(true));
  }, [canView, configured, profile, user]);

  return { offers, ready, canManage, canView };
}

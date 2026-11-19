"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/components/permissions-provider";
import { canReadAll, canWriteModule } from "@/lib/access";
import { firebaseDb } from "@/lib/firebase-client";
import { mapBlogPost, mapSiteDocument, type BlogPost, type SiteDocument } from "@/lib/website";

/** Live blog posts and public documents for the Website module. */
export function useWebsite() {
  const { user, profile, configured } = useAuth();
  const { ready: accessReady, level } = usePermissions();
  const websiteLevel = level("website");
  const canView = canReadAll(websiteLevel);
  const canEdit = canWriteModule(websiteLevel);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [documents, setDocuments] = useState<SiteDocument[]>([]);
  const [loaded, setLoaded] = useState({ posts: false, documents: false });

  const active = Boolean(configured && user && profile && accessReady && canView);

  useEffect(() => {
    if (!active) return;
    const stopPosts = onSnapshot(
      collection(firebaseDb(), "blogPosts"),
      (snap) => {
        setPosts(snap.docs.flatMap((item) => mapBlogPost(item.id, item.data()) ?? []));
        setLoaded((current) => ({ ...current, posts: true }));
      },
      () => setLoaded((current) => ({ ...current, posts: true })),
    );
    const stopDocuments = onSnapshot(
      collection(firebaseDb(), "siteDocuments"),
      (snap) => {
        setDocuments(snap.docs.flatMap((item) => mapSiteDocument(item.id, item.data()) ?? []));
        setLoaded((current) => ({ ...current, documents: true }));
      },
      () => setLoaded((current) => ({ ...current, documents: true })),
    );
    return () => {
      stopPosts();
      stopDocuments();
    };
  }, [active]);

  const sortedPosts = [...(active ? posts : [])].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.titleEn.localeCompare(b.titleEn));
  const sortedDocuments = [...(active ? documents : [])].sort((a, b) => a.order - b.order || a.titleEn.localeCompare(b.titleEn));

  return {
    posts: sortedPosts,
    documents: sortedDocuments,
    ready: Boolean(accessReady) && (!active || (loaded.posts && loaded.documents)),
    canView,
    canEdit,
  };
}

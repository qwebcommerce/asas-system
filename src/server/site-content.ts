import { cacheLife, cacheTag } from "next/cache";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { mapBlogPost, mapSiteDocument, pick, type BlogCategory, type SiteDocCategory } from "@/lib/website";
import { sampleDocuments, samplePosts, type SamplePhoto } from "@/lib/website-samples";

/*
 * Content for the public website pages.
 * Reads published records from Firestore (cached, tag "website", refreshed whenever the
 * Website module saves). When nothing is published yet, the sample content is used instead.
 */

export type PostCover = { kind: "sample"; photo: SamplePhoto } | { kind: "stored"; src: string } | null;

export type PostView = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  readMinutes: number;
  publishedOn: string;
  featured: boolean;
  cover: PostCover;
  coverAlt: string;
};

export type DocumentView = {
  key: string;
  title: string;
  description: string;
  category: SiteDocCategory;
  /** Download link for real documents; null for samples (requested by email). */
  href: string | null;
  fileName: string;
  size: number;
};

type StoredPost = NonNullable<ReturnType<typeof mapBlogPost>>;
type StoredDocument = NonNullable<ReturnType<typeof mapSiteDocument>>;

async function storedPosts(): Promise<StoredPost[]> {
  "use cache";
  cacheTag("website");
  cacheLife("hours");
  if (!isAdminConfigured()) return [];
  try {
    const snap = await adminDb().collection("blogPosts").where("status", "==", "published").get();
    return snap.docs
      .flatMap((doc) => mapBlogPost(doc.id, doc.data()) ?? [])
      .filter((post) => post.hasCover && post.publishedOn)
      .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
  } catch (error) {
    console.error("website posts unavailable", error);
    return [];
  }
}

async function storedDocuments(): Promise<StoredDocument[]> {
  "use cache";
  cacheTag("website");
  cacheLife("hours");
  if (!isAdminConfigured()) return [];
  try {
    const snap = await adminDb().collection("siteDocuments").where("status", "==", "published").get();
    return snap.docs
      .flatMap((doc) => mapSiteDocument(doc.id, doc.data()) ?? [])
      .filter((doc) => doc.hasFile)
      .sort((a, b) => a.order - b.order || a.titleEn.localeCompare(b.titleEn));
  } catch (error) {
    console.error("website documents unavailable", error);
    return [];
  }
}

/** All posts for a locale, newest first. `samples` is true while nothing is published. */
export async function sitePosts(locale: string): Promise<{ posts: PostView[]; samples: boolean }> {
  const stored = await storedPosts();
  if (stored.length > 0) {
    return {
      samples: false,
      posts: stored.map((post) => ({
        slug: post.slug,
        title: pick(post.titleEn, post.titleAr, locale),
        excerpt: pick(post.excerptEn, post.excerptAr, locale),
        body: pick(post.bodyEn, post.bodyAr, locale),
        category: post.category,
        readMinutes: post.readMinutes,
        publishedOn: post.publishedOn,
        featured: post.featured,
        cover: { kind: "stored", src: `/api/site-files/cover/${post.id}` },
        coverAlt: pick(post.coverAltEn, post.coverAltAr, locale) || pick(post.titleEn, post.titleAr, locale),
      })),
    };
  }
  return {
    samples: true,
    posts: samplePosts.map((post) => ({
      slug: post.slug,
      title: pick(post.titleEn, post.titleAr, locale),
      excerpt: pick(post.excerptEn, post.excerptAr, locale),
      body: pick(post.bodyEn, post.bodyAr, locale),
      category: post.category,
      readMinutes: post.readMinutes,
      publishedOn: post.publishedOn,
      featured: post.featured,
      cover: { kind: "sample", photo: post.photo },
      coverAlt: pick(post.coverAltEn, post.coverAltAr, locale),
    })),
  };
}

/** The Editor's pick: the newest featured post, otherwise the newest post. */
export function featuredPost(posts: PostView[]) {
  return posts.find((post) => post.featured) ?? posts[0] ?? null;
}

export async function sitePost(locale: string, slug: string) {
  const { posts, samples } = await sitePosts(locale);
  const index = posts.findIndex((post) => post.slug === slug);
  if (index < 0) return null;
  const post = posts[index];
  const related = [
    ...posts.filter((item, i) => i !== index && item.category === post.category),
    ...posts.filter((item, i) => i !== index && item.category !== post.category),
  ].slice(0, 3);
  return { post, related, samples };
}

/** Slugs to prerender: the sample stories plus any published posts. */
export async function postSlugs() {
  const stored = await storedPosts();
  return [...new Set([...samplePosts.map((post) => post.slug), ...stored.map((post) => post.slug)])];
}

export async function siteDocuments(locale: string): Promise<{ documents: DocumentView[]; samples: boolean }> {
  const stored = await storedDocuments();
  if (stored.length > 0) {
    return {
      samples: false,
      documents: stored.map((doc) => ({
        key: doc.id,
        title: pick(doc.titleEn, doc.titleAr, locale),
        description: pick(doc.descEn, doc.descAr, locale),
        category: doc.category,
        href: `/api/site-files/document/${doc.id}`,
        fileName: `${doc.fileName}.pdf`,
        size: doc.size,
      })),
    };
  }
  return {
    samples: true,
    documents: sampleDocuments.map((doc) => ({
      key: doc.titleEn,
      title: pick(doc.titleEn, doc.titleAr, locale),
      description: pick(doc.descEn, doc.descAr, locale),
      category: doc.category,
      href: null,
      fileName: "",
      size: 0,
    })),
  };
}

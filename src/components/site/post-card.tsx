import Image from "next/image";
import Link from "next/link";
import type { PostCover, PostView } from "@/server/site-content";
import { sitePath } from "./content";
import { Photo } from "./photo";

/** Cover of a post: a bundled sample photo, an uploaded image, or a branded placeholder. */
export function PostImage({ cover, alt, sizes, eager = false }: { cover: PostCover; alt: string; sizes: string; eager?: boolean }) {
  if (cover?.kind === "sample") return <Photo name={cover.photo} alt={alt} sizes={sizes} eager={eager} />;
  if (cover?.kind === "stored") {
    // Served through /api/site-files (signed Storage link), so it skips the image optimizer.
    return <Image src={cover.src} alt={alt} width={1600} height={1000} sizes={sizes} unoptimized loading={eager ? "eager" : "lazy"} />;
  }
  return <span className="photo-fallback" aria-hidden="true" />;
}

export function formatDate(day: string, locale: string) {
  if (!day) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-QA-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** Article card used on the blog list, the home page and "more stories". */
export function PostCard({
  post,
  locale,
  categoryLabel,
  minutesLabel,
  className = "article reveal",
  photoClass = "photo kb article__photo",
}: {
  post: PostView;
  locale: string;
  categoryLabel: string;
  minutesLabel: string;
  className?: string;
  photoClass?: string;
}) {
  return (
    <Link className={className} href={sitePath(locale as "en" | "ar", `/blogs/${post.slug}`)} data-cat={post.category}>
      <span className={photoClass}>
        <PostImage cover={post.cover} alt={post.coverAlt} sizes="(max-width: 1024px) 100vw, 33vw" />
      </span>
      <p className="label">{categoryLabel}</p>
      <h3>{post.title}</h3>
      <p className="article__time">{minutesLabel}</p>
    </Link>
  );
}

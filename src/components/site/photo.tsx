import Image from "next/image";

/** Intrinsic sizes of the images in /public/site (keeps next/image from shifting layout). */
const SIZES = {
  "about-construction": [588, 460],
  "about-dining": [588, 460],
  "about-lounge": [588, 460],
  "about-villa": [588, 460],
  "article-bathroom": [816, 476],
  "article-dining": [816, 476],
  "article-office": [816, 476],
  "article-staircase": [816, 476],
  "article-villa": [816, 476],
  "article-wood": [816, 476],
  "hero-villa": [2016, 1246],
  "journal-featured": [1500, 1020],
  "journal-hero": [1180, 1080],
  "project-family-lounge": [952, 720],
  "project-media-wall": [1544, 720],
  "project-modern-interior": [1544, 1020],
  "project-stone-villa": [952, 880],
  "services-villa": [1216, 760],
  "svc-construction": [360, 288],
  "svc-finishing": [360, 288],
  "svc-furniture": [360, 288],
  "svc-interior": [360, 288],
  "svc-plans": [360, 288],
} as const;

export type PhotoName = keyof typeof SIZES;

export function Photo({
  name,
  alt,
  sizes = "(max-width: 720px) 100vw, 50vw",
  eager = false,
}: {
  name: PhotoName;
  alt: string;
  sizes?: string;
  /** Above-the-fold image: load immediately with high priority */
  eager?: boolean;
}) {
  const [width, height] = SIZES[name];
  return <Image src={`/site/${name}.jpg`} alt={alt} width={width} height={height} sizes={sizes} loading={eager ? "eager" : undefined} fetchPriority={eager ? "high" : undefined} />;
}

export function Logo({ alt }: { alt: string }) {
  return <Image src="/site/logo.png" alt={alt} width={391} height={651} sizes="40px" />;
}

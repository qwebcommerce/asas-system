import Image from "next/image";

/** Intrinsic sizes of the images in /public/site (keeps next/image from shifting layout). */
const SIZES = {
  "about-capital": [470, 368],
  "about-columns": [896, 1024],
  "about-dining": [470, 368],
  "about-hero": [944, 896],
  "about-lounge": [470, 368],
  "about-pano": [1654, 676],
  "about-quality": [986, 672],
  "about-safety": [986, 672],
  "about-villa": [470, 368],
  "article-bathroom": [816, 476],
  "article-dining": [816, 476],
  "article-office": [816, 476],
  "article-staircase": [816, 476],
  "article-villa": [816, 476],
  "article-wood": [816, 476],
  "contact-hero": [944, 896],
  "hero-villa": [2016, 1246],
  "journal-featured": [1200, 816],
  "journal-hero": [944, 864],
  "p01-a": [477, 240],
  "p01-b": [477, 240],
  "p02-a": [477, 240],
  "p02-b": [477, 240],
  "p02-cover": [986, 640],
  "p03-a": [477, 240],
  "p03-b": [477, 240],
  "p03-cover": [986, 640],
  "p04-a": [477, 240],
  "p04-b": [477, 240],
  "p04-cover": [986, 640],
  "p05-a": [477, 240],
  "p05-b": [477, 240],
  "p06-a": [477, 240],
  "p06-b": [477, 240],
  "p06-cover": [986, 640],
  "p07-a": [477, 240],
  "p07-b": [477, 240],
  "p07-cover": [986, 640],
  "p08-a": [477, 240],
  "p08-b": [477, 240],
  "p08-cover": [986, 640],
  "project-media-wall": [1544, 720],
  "project-modern-interior": [1544, 1020],
  "projects-hero": [944, 896],
  "row-construction": [1024, 768],
  "row-finishing": [1024, 768],
  "row-furniture": [1024, 768],
  "row-interior": [1024, 768],
  "row-plans": [1024, 768],
  "services-hero": [944, 896],
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

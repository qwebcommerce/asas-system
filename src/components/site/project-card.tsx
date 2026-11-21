import Image from "next/image";
import Link from "next/link";
import type { ProjectCover, ProjectView } from "@/server/site-content";
import { sitePath } from "./content";
import { Photo } from "./photo";

/** A project's cover: a bundled sample photo or an uploaded image. */
export function ProjectImage({ cover, alt, sizes, eager = false }: { cover: ProjectCover; alt: string; sizes: string; eager?: boolean }) {
  if (cover.kind === "sample") return <Photo name={cover.photo} alt={alt} sizes={sizes} eager={eager} />;
  return <Image src={cover.src} alt={alt} width={1600} height={1000} sizes={sizes} unoptimized loading={eager ? "eager" : "lazy"} />;
}

/** Project card on the projects page and in "more projects". */
export function ProjectCard({ project, locale, index }: { project: ProjectView; locale: string; index: number }) {
  return (
    <Link className="work-card reveal" href={sitePath(locale as "en" | "ar", `/our-work/${project.slug}`)} data-cat={project.kind}>
      <div className="work-card__photo">
        <ProjectImage cover={project.cover} alt={project.coverAlt} sizes="(max-width: 1024px) 100vw, 50vw" />
        <span className="project__num">P-{String(index + 1).padStart(2, "0")}</span>
      </div>
      <p className="label">{[project.scope, project.location, project.year].filter(Boolean).join("  /  ")}</p>
      <h3>{project.name}</h3>
      <p className="work-card__summary">{project.summary}</p>
    </Link>
  );
}

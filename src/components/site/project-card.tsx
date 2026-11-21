import Image from "next/image";
import Link from "next/link";
import type { ProjectCover, ProjectView } from "@/server/site-content";
import { sitePath } from "./content";
import { Photo } from "./photo";

/** A project's photo: a bundled sample photo or an uploaded image. */
export function ProjectImage({ cover, alt, sizes, eager = false }: { cover: ProjectCover; alt: string; sizes: string; eager?: boolean }) {
  if (cover.kind === "sample") return <Photo name={cover.photo} alt={alt} sizes={sizes} eager={eager} />;
  return <Image src={cover.src} alt={alt} width={1600} height={1000} sizes={sizes} unoptimized loading={eager ? "eager" : "lazy"} />;
}

/** "P-01" */
export function projectNumber(index: number) {
  return `P-${String(index + 1).padStart(2, "0")}`;
}

/** Project card on the Our work page and in "more projects": cover, two photos, label, name and detail line. */
export function ProjectCard({ project, locale, index }: { project: ProjectView; locale: string; index: number }) {
  const alt = index % 2 === 0;
  return (
    <Link className="project reveal" href={sitePath(locale as "en" | "ar", `/our-work/${project.slug}`)} data-cat={project.kind}>
      <span className={`photo kb${alt ? " kb--alt" : ""} project__cover`}>
        <span className="num">{projectNumber(index)}</span>
        <ProjectImage cover={project.cover} alt={project.coverAlt} sizes="(max-width: 1024px) 100vw, 50vw" />
      </span>
      {project.thumbs.length > 0 ? (
        <span className="project__thumbs">
          {project.thumbs.map((thumb, i) => (
            <span className={`photo kb${(i === 0) === alt ? "" : " kb--alt"}`} key={i}>
              <ProjectImage cover={thumb} alt={project.name} sizes="(max-width: 720px) 50vw, 25vw" />
            </span>
          ))}
        </span>
      ) : null}
      <p className="label">{project.scope}</p>
      <h3>{project.name}</h3>
      {project.meta ? <p>{project.meta}</p> : null}
    </Link>
  );
}

/** Large photo card in the home page's "Selected work" mosaic. */
export function MosaicCard({ project, locale, index }: { project: ProjectView; locale: string; index: number }) {
  return (
    <Link className={`photo kb${index % 2 === 0 ? " kb--alt" : ""} project-card reveal`} href={sitePath(locale as "en" | "ar", `/our-work/${project.slug}`)}>
      <ProjectImage cover={project.cover} alt={project.coverAlt} sizes="(max-width: 1024px) 100vw, 60vw" />
      <span className="num">{projectNumber(index)}</span>
      <span>
        <span className="project-card__title">{project.name}</span>
        <span className="project-card__meta">{project.meta || project.scope}</span>
      </span>
    </Link>
  );
}

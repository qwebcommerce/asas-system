"use client";

import { useLocale, useTranslations } from "next-intl";
import { useProjects } from "@/components/use-projects";
import { projectName, type Project } from "@/lib/projects";

/**
 * Picks the project a record belongs to. `none` adds a first option for records that are
 * not tied to a project (e.g. office rent). Calls back with the project so forms can copy
 * its names (the server copies them again on save).
 */
export function ProjectSelect({
  value,
  onChange,
  none,
  required = false,
  label,
  error,
  id = "project-select",
}: {
  value: string;
  onChange: (projectId: string, project: Project | null) => void;
  none?: string;
  required?: boolean;
  label?: string;
  error?: string;
  id?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { projects, canView } = useProjects();
  const known = projects.some((project) => project.id === value);
  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label htmlFor={id}>{label ?? t("prj.project")}</label>
      <select
        id={id}
        className="select"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value, projects.find((project) => project.id === event.target.value) ?? null)}
      >
        {required ? <option value="" disabled>{t("prj.choose")}</option> : <option value="">{none ?? t("prj.none")}</option>}
        {value && !known ? <option value={value}>{t("prj.unavailable")}</option> : null}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.code} · {projectName(project, locale)}
          </option>
        ))}
      </select>
      {!canView ? <small className="muted">{t("prj.noAccess")}</small> : null}
      {error ? <span className="field-error">{t(error)}</span> : null}
    </div>
  );
}

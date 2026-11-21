"use client";

import { useState } from "react";

export type GridItem = { key: string; cat: string; node: React.ReactNode };

/**
 * Filter buttons + grid + page numbers, used by the Blogs and Our work collections.
 * Items are rendered on the server and passed in; this only decides which are shown.
 */
export function FilteredGrid({
  items,
  filters,
  filterLabel,
  gridClass,
  pageSize,
  pagesLabel,
  nextLabel,
  previousLabel,
}: {
  items: GridItem[];
  /** Filter buttons ("all" first); none shown when there is only one */
  filters: { key: string; label: string }[];
  filterLabel: string;
  gridClass: string;
  pageSize: number;
  pagesLabel: string;
  nextLabel: string;
  previousLabel: string;
}) {
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(0);
  const shown = items.filter((item) => active === "all" || item.cat === active);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = new Set(shown.slice(current * pageSize, current * pageSize + pageSize).map((item) => item.key));

  function goTo(next: number) {
    setPage(next);
    // Bring the top of the collection back into view after changing page
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {filters.length > 2 ? (
        <div className="filters" role="group" aria-label={filterLabel}>
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="filter"
              aria-pressed={active === filter.key}
              onClick={() => {
                setActive(filter.key);
                setPage(0);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={gridClass}>
        {items.map((item) => (
          // Hidden items stay in the page (for search engines and no-JS visitors) but out of view
          <div key={item.key} hidden={!visible.has(item.key)} style={{ display: visible.has(item.key) ? "contents" : undefined }}>
            {item.node}
          </div>
        ))}
      </div>
      {pages > 1 ? (
        <nav className="pagination" aria-label={pagesLabel}>
          {current > 0 ? <button type="button" aria-label={previousLabel} onClick={() => goTo(current - 1)}><span aria-hidden="true" className="pagination__arrow">←</span></button> : null}
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" aria-current={i === current ? "page" : undefined} onClick={() => goTo(i)}>
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
          <button type="button" aria-label={nextLabel} disabled={current >= pages - 1} onClick={() => goTo(current + 1)}><span aria-hidden="true" className="pagination__arrow">→</span></button>
        </nav>
      ) : null}
    </>
  );
}

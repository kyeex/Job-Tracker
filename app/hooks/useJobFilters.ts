"use client";

import { useMemo, useState } from "react";
import { EMPTY_COLUMN_FILTERS } from "@/lib/jobs/constants";
import type { ColumnFilters, Job, SortKey, Status } from "@/lib/jobs/types";

export function useJobFilters(jobs: Job[]) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "All">("All");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "date",
    direction: "desc",
  });

  const visibleJobs = useMemo(
    () =>
      jobs
        .filter((job) => filter === "All" || job.status === filter)
        .filter((job) => `${job.title} ${job.company}`.toLowerCase().includes(search.toLowerCase()))
        .filter((job) =>
          `${job.title} ${job.company} ${job.url}`
            .toLowerCase()
            .includes(columnFilters.opportunity.toLowerCase()),
        )
        .filter((job) => !columnFilters.date || job.date === columnFilters.date)
        .filter((job) => columnFilters.status === "All" || job.status === columnFilters.status)
        .filter((job) => job.notes.toLowerCase().includes(columnFilters.notes.toLowerCase()))
        .sort((a, b) => {
          const values: Record<SortKey, [string, string]> = {
            opportunity: [`${a.company} ${a.title}`.toLowerCase(), `${b.company} ${b.title}`.toLowerCase()],
            date: [a.date, b.date],
            status: [a.status, b.status],
            notes: [a.notes.toLowerCase(), b.notes.toLowerCase()],
          };
          const result = values[sort.key][0].localeCompare(values[sort.key][1]);
          return sort.direction === "asc" ? result : -result;
        }),
    [jobs, filter, search, columnFilters, sort],
  );

  const changeSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "date" ? "desc" : "asc" },
    );
  };

  const sortMark = (key: SortKey) => (sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕");
  const hasColumnFilters = Boolean(
    columnFilters.opportunity || columnFilters.date || columnFilters.status !== "All" || columnFilters.notes,
  );
  const clearColumnFilters = () => setColumnFilters(EMPTY_COLUMN_FILTERS);

  return {
    search,
    setSearch,
    filter,
    setFilter,
    columnFilters,
    setColumnFilters,
    sort,
    changeSort,
    sortMark,
    hasColumnFilters,
    clearColumnFilters,
    visibleJobs,
  };
}

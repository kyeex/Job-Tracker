"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { JOB_STATUSES } from "@/lib/jobs/constants";
import type { ColumnFilters, Job, LoadState, SortKey, Status } from "@/lib/jobs/types";

const PAGE_SIZE_OPTIONS = [8, 12, 20] as const;

type Props = {
  jobs: Job[];
  visibleJobs: Job[];
  loadState: LoadState;
  loadError: string;
  loadJobs: () => void;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  filter: Status | "All";
  setFilter: Dispatch<SetStateAction<Status | "All">>;
  columnFilters: ColumnFilters;
  setColumnFilters: Dispatch<SetStateAction<ColumnFilters>>;
  sort: { key: SortKey; direction: "asc" | "desc" };
  changeSort: (key: SortKey) => void;
  sortMark: (key: SortKey) => string;
  hasColumnFilters: boolean;
  clearColumnFilters: () => void;
  exportExcel: () => void;
  openAdd: () => void;
  openEdit: (job: Job) => void;
  removeJob: (id: string) => void;
  updateStatus: (job: Job, status: Status) => void;
  deletingIds: Set<string>;
  savingStatusIds: Set<string>;
};

export function OpportunitiesTable({
  jobs,
  visibleJobs,
  loadState,
  loadError,
  loadJobs,
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
  exportExcel,
  openAdd,
  openEdit,
  removeJob,
  updateStatus,
  deletingIds,
  savingStatusIds,
}: Props) {
  const isLoadingJobs = loadState === "loading";
  const hasLoadError = loadState === "error";
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(8);
  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = visibleJobs.length ? (safeCurrentPage - 1) * pageSize : 0;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, visibleJobs.length);
  const paginatedJobs = useMemo(
    () => visibleJobs.slice(pageStartIndex, pageEndIndex),
    [visibleJobs, pageStartIndex, pageEndIndex],
  );

  const goToPreviousPage = () => setCurrentPage((page) => Math.max(1, page - 1));
  const goToNextPage = () => setCurrentPage((page) => Math.min(totalPages, page + 1));
  const changePageSize = (nextPageSize: (typeof PAGE_SIZE_OPTIONS)[number]) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  };
  const updateColumnFilters = (nextFilters: ColumnFilters) => {
    setColumnFilters(nextFilters);
    setCurrentPage(1);
  };
  const updateSort = (key: SortKey) => {
    changeSort(key);
    setCurrentPage(1);
  };
  const clearFiltersAndResetPage = () => {
    clearColumnFilters();
    setCurrentPage(1);
  };

  return (
    <section className="tracker">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">APPLICATIONS</p>
          <h2>Your opportunities</h2>
        </div>
        <span>
          {visibleJobs.length} {visibleJobs.length === 1 ? "role" : "roles"}
          {visibleJobs.length > pageSize ? ` • page ${safeCurrentPage} of ${totalPages}` : ""}
        </span>
      </div>
      <div className="toolbar">
        <label className="search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by role or company…"
            aria-label="Search applications"
          />
        </label>
        <div className="toolbarActions">
          <div className="filters" aria-label="Filter by status">
            {(["All", ...JOB_STATUSES] as const).map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => {
                  setFilter(item);
                  setCurrentPage(1);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="excelButton"
            onClick={exportExcel}
            disabled={!visibleJobs.length}
            title="Export the visible grid rows to Excel"
          >
            <span>▦</span> Export Excel
          </button>
        </div>
      </div>

      {isLoadingJobs ? (
        <div className="empty loadingState" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <h3>Loading opportunities</h3>
          <p>Pulling your saved applications from the database.</p>
        </div>
      ) : hasLoadError ? (
        <div className="empty errorState" role="alert">
          <span>!</span>
          <h3>Could not load opportunities</h3>
          <p>{loadError}</p>
          <button onClick={loadJobs}>Retry</button>
        </div>
      ) : jobs.length ? (
        <>
          <div className="tableMeta" aria-live="polite">
            <span>
              {visibleJobs.length
                ? `Showing ${pageStartIndex + 1}-${pageEndIndex} of ${visibleJobs.length} matching applications`
                : "No matching applications"}
            </span>
            <label>
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tableWrap" tabIndex={0} aria-label="Scrollable applications table">
          <table>
            <thead>
              <tr className="columnHeadings">
                <th>
                  <button className={sort.key === "opportunity" ? "sorted" : ""} onClick={() => updateSort("opportunity")}>
                    Opportunity<span>{sortMark("opportunity")}</span>
                  </button>
                </th>
                <th>
                  <button className={sort.key === "date" ? "sorted" : ""} onClick={() => updateSort("date")}>
                    Date applied<span>{sortMark("date")}</span>
                  </button>
                </th>
                <th>
                  <button className={sort.key === "status" ? "sorted" : ""} onClick={() => updateSort("status")}>
                    Status<span>{sortMark("status")}</span>
                  </button>
                </th>
                <th>
                  <button className={sort.key === "notes" ? "sorted" : ""} onClick={() => updateSort("notes")}>
                    Notes<span>{sortMark("notes")}</span>
                  </button>
                </th>
                <th>
                  {hasColumnFilters && (
                    <button className="clearFilters" onClick={clearFiltersAndResetPage}>
                      Clear
                    </button>
                  )}
                  <span className="srOnly">Actions</span>
                </th>
              </tr>
              <tr className="columnFilters">
                <th>
                  <input
                    value={columnFilters.opportunity}
                    onChange={(e) => updateColumnFilters({ ...columnFilters, opportunity: e.target.value })}
                    placeholder="Filter role, company or URL"
                    aria-label="Filter opportunities"
                  />
                </th>
                <th>
                  <input
                    type="date"
                    value={columnFilters.date}
                    onChange={(e) => updateColumnFilters({ ...columnFilters, date: e.target.value })}
                    aria-label="Filter by application date"
                  />
                </th>
                <th>
                  <select
                    value={columnFilters.status}
                    onChange={(e) => updateColumnFilters({ ...columnFilters, status: e.target.value as Status | "All" })}
                    aria-label="Filter by column status"
                  >
                    <option>All</option>
                    {JOB_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </th>
                <th>
                  <input
                    value={columnFilters.notes}
                    onChange={(e) => updateColumnFilters({ ...columnFilters, notes: e.target.value })}
                    placeholder="Filter notes"
                    aria-label="Filter notes"
                  />
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => {
                const isDeleting = deletingIds.has(job.id);
                const isSavingStatus = savingStatusIds.has(job.id);
                return (
                  <tr key={job.id} className={isDeleting ? "rowSaving" : ""}>
                    <td>
                      <div className="opportunity">
                        <span className="companyAvatar">{job.company.slice(0, 1).toUpperCase()}</span>
                        <div>
                          {job.url ? (
                            <a
                              className="jobTitleLink"
                              href={job.url.startsWith("http") ? job.url : `https://${job.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${job.title} at ${job.company} in a new tab`}
                            >
                              <strong>
                                {job.title}
                                <span className="newTabMark" aria-hidden="true">
                                  ↗
                                </span>
                              </strong>
                            </a>
                          ) : (
                            <strong>{job.title}</strong>
                          )}
                          <span>{job.company}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {new Date(`${job.date}T12:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="statusCell">
                        <select
                          className={`statusSelect status-${job.status.toLowerCase()}`}
                          value={job.status}
                          disabled={isSavingStatus || isDeleting}
                          onChange={(e) => updateStatus(job, e.target.value as Status)}
                        >
                          {JOB_STATUSES.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        {isSavingStatus && <span className="savingPill">Saving</span>}
                      </div>
                    </td>
                    <td className="notesCell">{job.notes || <span>—</span>}</td>
                    <td>
                      <div className="rowActions">
                        <button disabled={isDeleting || isSavingStatus} onClick={() => openEdit(job)} aria-label={`Edit ${job.title}`}>
                          Edit
                        </button>
                        <button
                          className="delete"
                          disabled={isDeleting || isSavingStatus}
                          onClick={() => removeJob(job.id)}
                          aria-label={`Delete ${job.title}`}
                        >
                          {isDeleting ? "..." : "×"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleJobs.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty tableEmpty">
                      <span>✦</span>
                      <h3>No matching opportunities</h3>
                      <p>Adjust or clear a filter to see more roles.</p>
                      {hasColumnFilters && <button onClick={clearFiltersAndResetPage}>Clear column filters</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {visibleJobs.length > pageSize && (
            <nav className="pagination" aria-label="Applications pagination">
              <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}>
                First
              </button>
              <button onClick={goToPreviousPage} disabled={safeCurrentPage === 1}>
                Previous
              </button>
              <span>
                Page <strong>{safeCurrentPage}</strong> of {totalPages}
              </span>
              <button onClick={goToNextPage} disabled={safeCurrentPage === totalPages}>
                Next
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}>
                Last
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="empty">
          <span>✦</span>
          <h3>No opportunities here yet</h3>
          <p>Add your first application to start tracking.</p>
          <button onClick={openAdd}>Add application</button>
        </div>
      )}
    </section>
  );
}

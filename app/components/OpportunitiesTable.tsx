"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ColumnFilters, Job, LoadState, SortKey, Status } from "@/lib/jobs/types";
import { PAGE_SIZE_OPTIONS, usePagination, type PageSize } from "../hooks/usePagination";
import { OpportunitiesFilters } from "./OpportunitiesFilters";
import { OpportunitiesToolbar } from "./OpportunitiesToolbar";
import { OpportunityRow } from "./OpportunityRow";
import { PaginationControls } from "./PaginationControls";

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
  const pagination = usePagination(visibleJobs);
  const isLoading = loadState === "loading";
  const hasLoadError = loadState === "error";

  const updateColumnFilters = (nextFilters: ColumnFilters) => {
    setColumnFilters(nextFilters);
    pagination.resetPage();
  };
  const updateSort = (key: SortKey) => {
    changeSort(key);
    pagination.resetPage();
  };
  const clearFilters = () => {
    clearColumnFilters();
    pagination.resetPage();
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
          {visibleJobs.length > pagination.pageSize
            ? ` • page ${pagination.currentPage} of ${pagination.totalPages}`
            : ""}
        </span>
      </div>

      <OpportunitiesToolbar
        search={search}
        filter={filter}
        hasVisibleJobs={Boolean(visibleJobs.length)}
        onSearchChange={(value) => {
          setSearch(value);
          pagination.resetPage();
        }}
        onFilterChange={(value) => {
          setFilter(value);
          pagination.resetPage();
        }}
        onExport={exportExcel}
      />

      {isLoading ? (
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
          <button type="button" onClick={loadJobs}>Retry</button>
        </div>
      ) : jobs.length ? (
        <>
          <div className="tableMeta" aria-live="polite">
            <span>
              {visibleJobs.length
                ? `Showing ${pagination.startIndex + 1}-${pagination.endIndex} of ${visibleJobs.length} matching applications`
                : "No matching applications"}
            </span>
            <label>
              Rows per page
              <select
                value={pagination.pageSize}
                onChange={(event) => pagination.changePageSize(Number(event.target.value) as PageSize)}
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <div className="tableWrap" tabIndex={0} aria-label="Scrollable applications table">
            <table>
              <OpportunitiesFilters
                filters={columnFilters}
                sort={sort}
                hasFilters={hasColumnFilters}
                sortMark={sortMark}
                onSort={updateSort}
                onChange={updateColumnFilters}
                onClear={clearFilters}
              />
              <tbody>
                {pagination.pageItems.map((job) => (
                  <OpportunityRow
                    key={job.id}
                    job={job}
                    isDeleting={deletingIds.has(job.id)}
                    isSavingStatus={savingStatusIds.has(job.id)}
                    onEdit={openEdit}
                    onDelete={removeJob}
                    onStatusChange={updateStatus}
                  />
                ))}
                {!visibleJobs.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty tableEmpty">
                        <span>✦</span>
                        <h3>No matching opportunities</h3>
                        <p>Adjust or clear a filter to see more roles.</p>
                        {hasColumnFilters && <button type="button" onClick={clearFilters}>Clear column filters</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleJobs.length > pagination.pageSize && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onFirst={pagination.goToFirstPage}
              onPrevious={pagination.goToPreviousPage}
              onNext={pagination.goToNextPage}
              onLast={pagination.goToLastPage}
            />
          )}
        </>
      ) : (
        <div className="empty">
          <span>✦</span>
          <h3>No opportunities here yet</h3>
          <p>Add your first application to start tracking.</p>
          <button type="button" onClick={openAdd}>Add application</button>
        </div>
      )}
    </section>
  );
}

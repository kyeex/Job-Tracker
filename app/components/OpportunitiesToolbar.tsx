import { JOB_STATUSES } from "@/lib/jobs/constants";
import type { Status } from "@/lib/jobs/types";

type Props = {
  search: string;
  filter: Status | "All";
  hasVisibleJobs: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: Status | "All") => void;
  onExport: () => void;
};

export function OpportunitiesToolbar({
  search,
  filter,
  hasVisibleJobs,
  onSearchChange,
  onFilterChange,
  onExport,
}: Props) {
  return (
    <div className="toolbar">
      <label className="search">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by role or company…"
          aria-label="Search applications"
        />
      </label>
      <div className="toolbarActions">
        <div className="filters" aria-label="Filter by status">
          {(["All", ...JOB_STATUSES] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => onFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="excelButton"
          onClick={onExport}
          disabled={!hasVisibleJobs}
          title="Export the visible grid rows to Excel"
        >
          <span>▦</span> Export Excel
        </button>
      </div>
    </div>
  );
}

import { JOB_STATUSES } from "@/lib/jobs/constants";
import type { ColumnFilters, SortKey, Status } from "@/lib/jobs/types";

type Props = {
  filters: ColumnFilters;
  sort: { key: SortKey; direction: "asc" | "desc" };
  hasFilters: boolean;
  sortMark: (key: SortKey) => string;
  onSort: (key: SortKey) => void;
  onChange: (filters: ColumnFilters) => void;
  onClear: () => void;
};

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "opportunity", label: "Opportunity" },
  { key: "date", label: "Date applied" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

export function OpportunitiesFilters({ filters, sort, hasFilters, sortMark, onSort, onChange, onClear }: Props) {
  return (
    <thead>
      <tr className="columnHeadings">
        {columns.map((column) => (
          <th key={column.key}>
            <button
              type="button"
              className={sort.key === column.key ? "sorted" : ""}
              onClick={() => onSort(column.key)}
            >
              {column.label}<span>{sortMark(column.key)}</span>
            </button>
          </th>
        ))}
        <th>
          {hasFilters && (
            <button type="button" className="clearFilters" onClick={onClear}>
              Clear
            </button>
          )}
          <span className="srOnly">Actions</span>
        </th>
      </tr>
      <tr className="columnFilters">
        <th>
          <input
            value={filters.opportunity}
            onChange={(event) => onChange({ ...filters, opportunity: event.target.value })}
            placeholder="Filter role, company or URL"
            aria-label="Filter opportunities"
          />
        </th>
        <th>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => onChange({ ...filters, date: event.target.value })}
            aria-label="Filter by application date"
          />
        </th>
        <th>
          <select
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as Status | "All" })}
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
            value={filters.notes}
            onChange={(event) => onChange({ ...filters, notes: event.target.value })}
            placeholder="Filter notes"
            aria-label="Filter notes"
          />
        </th>
        <th />
      </tr>
    </thead>
  );
}

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useJobFilters } from "@/app/hooks/useJobFilters";
import { OpportunitiesTable } from "@/app/components/OpportunitiesTable";
import { PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD } from "@/lib/jobs/constants";
import type { Job, LoadState, Status } from "@/lib/jobs/types";
import { describe, expect, it, vi } from "vitest";

const makeJobs = (count: number): Job[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      id: `job-${number}`,
      date: `2026-01-${String(number).padStart(2, "0")}`,
      title: `Role ${number}`,
      company: number % 2 ? "Acme" : "Beacon",
      url: `https://example.com/jobs/${number}`,
      status: number % 3 === 0 ? "Interview" : "Applied",
      notes: number === 12 ? "Priority role" : "",
    };
  });

type HarnessProps = {
  jobs: Job[];
  openEdit?: (job: Job) => void;
  removeJob?: (id: string) => void;
  updateStatus?: (job: Job, status: Status) => void;
  exportExcel?: () => void;
  loadState?: LoadState;
  loadError?: string;
  loadJobs?: () => void;
  openAdd?: () => void;
};

function TableHarness({
  jobs,
  openEdit = vi.fn(),
  removeJob = vi.fn(),
  updateStatus = vi.fn(),
  exportExcel = vi.fn(),
  loadState = "ready",
  loadError = "",
  loadJobs = vi.fn(),
  openAdd = vi.fn(),
}: HarnessProps) {
  const filters = useJobFilters(jobs);

  return (
    <OpportunitiesTable
      jobs={jobs}
      visibleJobs={filters.visibleJobs}
      loadState={loadState}
      loadError={loadError}
      loadJobs={loadJobs}
      {...filters}
      exportExcel={exportExcel}
      openAdd={openAdd}
      openEdit={openEdit}
      removeJob={removeJob}
      updateStatus={updateStatus}
      deletingIds={new Set()}
      savingStatusIds={new Set()}
    />
  );
}

describe("OpportunitiesTable behavior", () => {
  it("paginates results and resets to the first page when searching", async () => {
    const user = userEvent.setup();
    render(<TableHarness jobs={makeJobs(12)} />);

    expect(screen.getByRole("link", { name: /open role 12/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open role 1 at/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open role 1 at/i })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Search applications" }), "Role 12");
    expect(screen.getByRole("link", { name: /open role 12/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Applications pagination" })).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1-1 of 1 matching applications")).toBeInTheDocument();
  });

  it("filters by status and exports the currently visible result set", async () => {
    const user = userEvent.setup();
    const exportExcel = vi.fn();
    render(<TableHarness jobs={makeJobs(6)} exportExcel={exportExcel} />);

    await user.click(within(screen.getByLabelText("Filter by status")).getByRole("button", { name: "Interview" }));

    expect(screen.getByRole("link", { name: /open role 6/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open role 3/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open role 5/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /export excel/i }));
    expect(exportExcel).toHaveBeenCalledOnce();
  });

  it("exposes a safe new-tab link and forwards row actions", async () => {
    const user = userEvent.setup();
    const [job] = makeJobs(1);
    const openEdit = vi.fn();
    const removeJob = vi.fn();
    const updateStatus = vi.fn();
    render(
      <TableHarness jobs={[job]} openEdit={openEdit} removeJob={removeJob} updateStatus={updateStatus} />,
    );

    const link = screen.getByRole("link", { name: /open role 1 at acme/i });
    expect(link).toHaveAttribute("href", job.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    await user.selectOptions(screen.getByRole("combobox", { name: "Status for Role 1" }), "Offer");
    expect(updateStatus).toHaveBeenCalledWith(job, "Offer");

    await user.click(screen.getByRole("button", { name: "Edit Role 1" }));
    expect(openEdit).toHaveBeenCalledWith(job);

    await user.click(screen.getByRole("button", { name: "Delete Role 1" }));
    expect(removeJob).toHaveBeenCalledWith(job.id);
  });

  it("shows actionable loading, error, retry, and empty states", async () => {
    const user = userEvent.setup();
    const loadJobs = vi.fn();
    const openAdd = vi.fn();
    const view = render(<TableHarness jobs={[]} loadState="loading" loadJobs={loadJobs} openAdd={openAdd} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading opportunities");

    view.rerender(
      <TableHarness jobs={[]} loadState="error" loadError="Firestore unavailable" loadJobs={loadJobs} openAdd={openAdd} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Firestore unavailable");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(loadJobs).toHaveBeenCalledOnce();

    view.rerender(<TableHarness jobs={[]} loadState="ready" loadJobs={loadJobs} openAdd={openAdd} />);
    await user.click(screen.getByRole("button", { name: "Add application" }));
    expect(openAdd).toHaveBeenCalledOnce();
  });

  it("explains the full-collection constraint at the personal-scale threshold", () => {
    render(<TableHarness jobs={makeJobs(PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD)} />);

    expect(screen.getByRole("status")).toHaveTextContent("loads all 1,000 applications");
    expect(screen.getByRole("status")).toHaveTextContent("complete history");
  });
});

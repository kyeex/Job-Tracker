import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountControl } from "@/app/components/AccountControl";
import { ApplicationRhythm } from "@/app/components/ApplicationRhythm";
import { DashboardStats } from "@/app/components/DashboardStats";
import { MigrationBanner } from "@/app/components/MigrationBanner";
import type { Job } from "@/lib/jobs/types";
import { describe, expect, it, vi } from "vitest";

const jobs: Job[] = [
  { id: "1", date: "2025-01-02", title: "Engineer", company: "Acme", url: "", status: "Applied", notes: "" },
  { id: "2", date: "2025-01-02", title: "Designer", company: "Beacon", url: "", status: "Interview", notes: "" },
  { id: "3", date: "2024-05-06", title: "Writer", company: "Cedar", url: "", status: "Rejected", notes: "" },
];

describe("dashboard behavior", () => {
  it("calculates application, active, and interview totals", () => {
    render(<DashboardStats jobs={jobs} />);
    const summary = screen.getByRole("region", { name: "Application summary" });

    expect(within(summary).getByText("Total applications").previousElementSibling).toHaveTextContent("3");
    expect(within(summary).getByText("Active pursuits").previousElementSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Interviews").previousElementSibling).toHaveTextContent("1");
  });

  it("switches heat-map years and reports the selected year's activity", async () => {
    const user = userEvent.setup();
    render(<ApplicationRhythm jobs={jobs} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Year" }), "2025");
    expect(screen.getByText(/2 applications across 1 active day/)).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "2025 job application activity" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /3 cumulative applications at the Sprout stage/i })).toBeInTheDocument();
  });

  it("routes guest and connected-account actions correctly", async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    const onSignOut = vi.fn();
    const view = render(
      <AccountControl user={null} state="ready" busy={false} error="" onConnect={onConnect} onSignOut={onSignOut} />,
    );

    await user.click(screen.getByRole("button", { name: "Connect a Google account" }));
    expect(onConnect).toHaveBeenCalledOnce();

    view.rerender(
      <AccountControl
        user={{ uid: "user-1", displayName: "Ada Lovelace", email: "ada@example.com", isAnonymous: false }}
        state="ready"
        busy={false}
        error=""
        onConnect={onConnect}
        onSignOut={onSignOut}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Sign out of Ada Lovelace" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.getByText("Applications recoverable")).toBeInTheDocument();
  });

  it("offers migration, disables duplicate submissions, and reports completion", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const view = render(<MigrationBanner migration={{ status: "available", count: 2 }} onImport={onImport} />);

    await user.click(screen.getByRole("button", { name: "Import existing applications" }));
    expect(onImport).toHaveBeenCalledOnce();

    view.rerender(<MigrationBanner migration={{ status: "importing", count: 2 }} onImport={onImport} />);
    expect(screen.getByRole("button", { name: "Importing..." })).toBeDisabled();

    view.rerender(<MigrationBanner migration={{ status: "complete", count: 2 }} onImport={onImport} />);
    expect(screen.getByText(/2 browser-saved applications are now in the database/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

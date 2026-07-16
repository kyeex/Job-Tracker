import { render, screen, waitFor } from "@testing-library/react";
import { useJobs } from "@/app/hooks/useJobs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  listFirestoreJobs: vi.fn(async (userId: string) => [
    {
      id: `${userId}-job`,
      dateApplied: "2026-07-16",
      jobTitle: `Role for ${userId}`,
      company: "Acme",
      jobUrl: "",
      status: "Applied" as const,
      notes: "",
    },
  ]),
  createFirestoreJob: vi.fn(),
  updateFirestoreJob: vi.fn(),
  deleteFirestoreJob: vi.fn(),
  importFirestoreJobs: vi.fn(),
}));

vi.mock("@/app/lib/firestore-jobs", () => repository);

function JobsHarness({ userId }: { userId: string | null }) {
  const { jobs, loadState } = useJobs(userId);
  return (
    <div>
      <span>{loadState}</span>
      {jobs.map((job) => <span key={job.id}>{job.title}</span>)}
    </div>
  );
}

describe("useJobs user scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the stable UID to reads and hides the previous user's data during a switch", async () => {
    const view = render(<JobsHarness userId="user-a" />);

    expect(await screen.findByText("Role for user-a")).toBeInTheDocument();
    expect(repository.listFirestoreJobs).toHaveBeenCalledWith("user-a");

    view.rerender(<JobsHarness userId="user-b" />);
    expect(screen.queryByText("Role for user-a")).not.toBeInTheDocument();

    expect(await screen.findByText("Role for user-b")).toBeInTheDocument();
    await waitFor(() => expect(repository.listFirestoreJobs).toHaveBeenCalledWith("user-b"));
  });
});

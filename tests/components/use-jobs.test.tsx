import { render, screen, waitFor } from "@testing-library/react";
import { useJobs } from "@/app/hooks/useJobs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  import: vi.fn(),
  getFirebaseJobsRepository: vi.fn(),
}));

vi.mock("@/app/lib/firestore-jobs", () => ({
  getFirebaseJobsRepository: repository.getFirebaseJobsRepository,
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    repository.getFirebaseJobsRepository.mockImplementation((userId: string) => {
      repository.list.mockResolvedValue([
        {
          id: `${userId}-job`,
          dateApplied: "2026-07-16",
          jobTitle: `Role for ${userId}`,
          company: "Acme",
          jobUrl: "",
          status: "Applied" as const,
          notes: "",
        },
      ]);
      return repository;
    });
  });

  it("passes the stable UID to reads and hides the previous user's data during a switch", async () => {
    const view = render(<JobsHarness userId="user-a" />);

    expect(await screen.findByText("Role for user-a")).toBeInTheDocument();
    expect(repository.getFirebaseJobsRepository).toHaveBeenCalledWith("user-a");
    expect(repository.list).toHaveBeenCalledOnce();

    view.rerender(<JobsHarness userId="user-b" />);
    expect(screen.queryByText("Role for user-a")).not.toBeInTheDocument();

    expect(await screen.findByText("Role for user-b")).toBeInTheDocument();
    await waitFor(() => expect(repository.getFirebaseJobsRepository).toHaveBeenCalledWith("user-b"));
  });
});

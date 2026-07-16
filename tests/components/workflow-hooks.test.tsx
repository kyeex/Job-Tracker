import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountTransfer } from "@/app/hooks/useAccountTransfer";
import { useApplicationForm } from "@/app/hooks/useApplicationForm";
import { useJobExports } from "@/app/hooks/useJobExports";
import { readAuthTransfer, saveAuthTransfer } from "@/app/lib/auth-transfer";
import type { Job } from "@/lib/jobs/types";

const xlsx = vi.hoisted(() => ({
  makeXlsx: vi.fn(() => new Blob(["xlsx"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })),
}));

vi.mock("@/app/lib/xlsx-export", () => xlsx);

const job: Job = {
  id: "job-1",
  date: "2026-07-16",
  title: "Product Designer",
  company: "Acme",
  url: "https://example.com/job",
  status: "Applied",
  notes: "Portfolio review",
};

describe("account transfer workflow", () => {
  beforeEach(() => window.localStorage.clear());

  it("backs up current jobs before connecting Google", async () => {
    const connectGoogle = vi.fn().mockResolvedValue(undefined);
    const showToast = vi.fn();
    const { result } = renderHook(() => useAccountTransfer({
      jobs: [job],
      user: { uid: "guest", displayName: "", email: "", isAnonymous: true },
      connectGoogle,
      continueAsGuest: vi.fn(),
      importJobs: vi.fn(),
      showToast,
    }));

    await act(() => result.current.connectGoogleAccount());

    expect(connectGoogle).toHaveBeenCalledOnce();
    expect(readAuthTransfer()).toEqual([expect.objectContaining({ id: job.id, jobTitle: job.title })]);
    expect(showToast).toHaveBeenCalledWith("Google account connected. Your applications are now recoverable.");
  });

  it("restores and clears a pending transfer for a recoverable account", async () => {
    saveAuthTransfer([{ id: "job-1", dateApplied: job.date, jobTitle: job.title, company: job.company }]);
    const importJobs = vi.fn().mockResolvedValue(undefined);
    const showToast = vi.fn();

    renderHook(() => useAccountTransfer({
      jobs: [],
      user: { uid: "account", displayName: "Taylor", email: "taylor@example.com", isAnonymous: false },
      connectGoogle: vi.fn(),
      continueAsGuest: vi.fn(),
      importJobs,
      showToast,
    }));

    await waitFor(() => expect(importJobs).toHaveBeenCalledOnce());
    await waitFor(() => expect(readAuthTransfer()).toEqual([]));
    expect(showToast).toHaveBeenCalledWith("1 applications restored to your Google account");
  });
});

describe("application form workflow", () => {
  it("opens, saves, and closes a new application", async () => {
    const addJob = vi.fn().mockResolvedValue(job);
    const showToast = vi.fn();
    const jobForm = {
      date: job.date,
      title: job.title,
      company: job.company,
      url: job.url,
      status: job.status,
      notes: job.notes,
    };
    const { result } = renderHook(() => useApplicationForm({
      addJob,
      editJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJobStatus: vi.fn(),
      showToast,
    }));

    act(() => result.current.openAdd());
    act(() => result.current.setForm(jobForm));
    await act(() => result.current.saveJob({ preventDefault: vi.fn() } as never));

    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({ title: job.title, company: job.company }));
    expect(result.current.dialogOpen).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Application added");
  });

  it("keeps the dialog open and exposes a useful save error", async () => {
    const addJob = vi.fn().mockRejectedValue(new Error("Firestore is unavailable"));
    const { result } = renderHook(() => useApplicationForm({
      addJob,
      editJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJobStatus: vi.fn(),
      showToast: vi.fn(),
    }));

    act(() => result.current.openAdd());
    await act(() => result.current.saveJob({ preventDefault: vi.fn() } as never));

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.formError).toBe("Firestore is unavailable");
    expect(result.current.formSaving).toBe(false);
  });
});

describe("export workflow", () => {
  const createObjectURL = vi.fn(() => "blob:job-export");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    xlsx.makeXlsx.mockClear();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("downloads a complete JSON backup", () => {
    const showToast = vi.fn();
    const { result } = renderHook(() => useJobExports({ jobs: [job], visibleJobs: [job], showToast }));

    act(() => result.current.exportBackup());

    expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: "application/json" }));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:job-export");
    expect(showToast).toHaveBeenCalledWith("Backup downloaded");
  });

  it("exports only visible jobs to Excel and skips an empty result", async () => {
    const showToast = vi.fn();
    const populated = renderHook(() => useJobExports({ jobs: [job], visibleJobs: [job], showToast }));

    await act(() => populated.result.current.exportExcel());
    expect(xlsx.makeXlsx).toHaveBeenCalledWith([job]);
    expect(showToast).toHaveBeenCalledWith("1 row exported to Excel");

    xlsx.makeXlsx.mockClear();
    const empty = renderHook(() => useJobExports({ jobs: [job], visibleJobs: [], showToast }));
    await act(() => empty.result.current.exportExcel());
    expect(xlsx.makeXlsx).not.toHaveBeenCalled();
  });
});

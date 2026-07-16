import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "@/app/hooks/useToast";

describe("useToast timing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("restarts dismissal timing when a newer message arrives", () => {
    const { result } = renderHook(() => useToast());

    act(() => result.current.showToast("First message"));
    act(() => vi.advanceTimersByTime(2_000));
    act(() => result.current.showToast("Second message"));
    act(() => vi.advanceTimersByTime(500));

    expect(result.current.toast).toBe("Second message");

    act(() => vi.advanceTimersByTime(1_900));
    expect(result.current.toast).toBe("");
  });

  it("clears the pending dismissal timer when unmounted", () => {
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    const { result, unmount } = renderHook(() => useToast());

    act(() => result.current.showToast("Temporary message"));
    unmount();

    expect(clearTimeout).toHaveBeenCalledOnce();
  });
});

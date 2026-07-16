import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyJob } from "../lib/jobs/mappers.ts";
import { formatLocalDate } from "../lib/local-date.ts";

test("local dates use calendar fields instead of UTC serialization", () => {
  const localCalendarDate = {
    getFullYear: () => 2026,
    getMonth: () => 6,
    getDate: () => 16,
    toISOString: () => "2026-07-17T03:30:00.000Z",
  };

  assert.equal(formatLocalDate(localCalendarDate), "2026-07-16");
});

test("new application defaults are created from the supplied local date", () => {
  assert.equal(createEmptyJob(new Date(2026, 6, 16, 23, 59)).date, "2026-07-16");
});

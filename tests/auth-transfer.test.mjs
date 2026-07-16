import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthTransfer,
  createAuthTransferRecords,
  readAuthTransfer,
  saveAuthTransfer,
} from "../app/lib/auth-transfer.ts";

const values = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
};

test("auth transfer preserves stable job IDs and domain fields", () => {
  const records = createAuthTransferRecords([
    {
      id: "job-1",
      date: "2026-07-16",
      title: "Product Designer",
      company: "Acme",
      url: "https://example.com/job",
      status: "Interview",
      notes: "Portfolio review",
    },
  ]);

  saveAuthTransfer(records);
  assert.deepEqual(readAuthTransfer(), [
    {
      id: "job-1",
      dateApplied: "2026-07-16",
      jobTitle: "Product Designer",
      company: "Acme",
      jobUrl: "https://example.com/job",
      status: "Interview",
      notes: "Portfolio review",
    },
  ]);

  clearAuthTransfer();
  assert.deepEqual(readAuthTransfer(), []);
});

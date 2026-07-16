import assert from "node:assert/strict";
import test from "node:test";
import {
  JobValidationError,
  requireValidJobInput,
  requireValidJobUpdate,
} from "../lib/jobs/validation.ts";

const validJob = {
  dateApplied: "2026-07-16",
  jobTitle: " Product Designer ",
  company: " Acme ",
  jobUrl: "example.com/jobs/designer",
  status: "Applied",
  notes: " Follow up Friday ",
};

test("shared validation normalizes a complete Firestore job", () => {
  assert.deepEqual(requireValidJobInput(validJob), {
    dateApplied: "2026-07-16",
    jobTitle: "Product Designer",
    company: "Acme",
    jobUrl: "https://example.com/jobs/designer",
    status: "Applied",
    notes: "Follow up Friday",
  });
});

test("shared validation rejects malformed Firestore create data", () => {
  assert.throws(
    () =>
      requireValidJobInput({
        ...validJob,
        dateApplied: "2026-02-31",
        jobTitle: "",
        status: "Archived",
      }),
    (error) => {
      assert.ok(error instanceof JobValidationError);
      assert.match(error.fields.dateApplied, /valid date/);
      assert.match(error.fields.jobTitle, /required/);
      assert.match(error.fields.status, /Status must be one of/);
      return true;
    },
  );
});

test("shared validation accepts and normalizes partial Firestore updates", () => {
  assert.deepEqual(requireValidJobUpdate({ jobUrl: "jobs.example.com/role", notes: " Updated " }), {
    jobUrl: "https://jobs.example.com/role",
    notes: "Updated",
  });
});

test("shared validation rejects an empty or unsupported status update", () => {
  for (const status of ["", "Archived"]) {
    assert.throws(
      () => requireValidJobUpdate({ status }),
      (error) => error instanceof JobValidationError && Boolean(error.fields.status),
    );
  }
});

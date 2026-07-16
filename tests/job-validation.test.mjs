import assert from "node:assert/strict";
import test from "node:test";
import {
  JobValidationError,
  requireValidJobInput,
  requireValidJobUpdate,
} from "../lib/jobs/validation.ts";
import { DEFAULT_JOB_STATUS, JOB_STATUSES } from "../lib/jobs/constants.ts";
import { jobContractCases } from "./job-contract.ts";

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

test("the default status is part of the supported status contract", () => {
  assert.ok(JOB_STATUSES.includes(DEFAULT_JOB_STATUS));
});

test("shared validation enforces every constants-driven job contract case", async (t) => {
  for (const contractCase of jobContractCases) {
    await t.test(contractCase.name, () => {
      if (contractCase.accepted) {
        assert.doesNotThrow(() => requireValidJobInput(contractCase.payload));
        return;
      }

      assert.throws(
        () => requireValidJobInput(contractCase.payload),
        (error) => error instanceof JobValidationError,
      );
    });
  }
});

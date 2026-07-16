import assert from "node:assert/strict";
import test from "node:test";
import { FIRESTORE_IMPORT_BATCH_SIZE, prepareJobImports } from "../lib/jobs/imports.ts";

const record = (title) => ({
  dateApplied: "2026-07-16",
  jobTitle: title,
  company: "Acme",
  jobUrl: "https://example.com/jobs",
  status: "Applied",
  notes: "",
});

test("imports use a safe Firestore batch size", () => {
  assert.equal(FIRESTORE_IMPORT_BATCH_SIZE, 400);
});

test("derived import IDs are stable when records are reordered", () => {
  const first = prepareJobImports([record("Engineer"), record("Designer")]);
  const reordered = prepareJobImports([record("Designer"), record("Engineer")]);
  const firstIds = Object.fromEntries(first.map((item) => [item.values.jobTitle, item.id]));
  const reorderedIds = Object.fromEntries(reordered.map((item) => [item.values.jobTitle, item.id]));

  assert.deepEqual(firstIds, reorderedIds);
});

test("identical records receive distinct but repeatable IDs", () => {
  const first = prepareJobImports([record("Engineer"), record("Engineer")]);
  const second = prepareJobImports([record("Engineer"), record("Engineer")]);

  assert.notEqual(first[0].id, first[1].id);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id));
});

test("duplicate explicit IDs are rejected before writing", () => {
  assert.throws(
    () => prepareJobImports([{ ...record("Engineer"), id: "same-id" }, { ...record("Designer"), id: "same-id" }]),
    /duplicate application ID/,
  );
});

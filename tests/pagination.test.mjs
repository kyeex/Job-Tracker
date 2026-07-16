import assert from "node:assert/strict";
import test from "node:test";
import { getPageWindow } from "../app/hooks/usePagination.ts";

test("pagination returns a stable empty first page", () => {
  assert.deepEqual(getPageWindow(0, 8, 4), {
    totalPages: 1,
    currentPage: 1,
    startIndex: 0,
    endIndex: 0,
  });
});

test("pagination calculates page boundaries", () => {
  assert.deepEqual(getPageWindow(25, 8, 2), {
    totalPages: 4,
    currentPage: 2,
    startIndex: 8,
    endIndex: 16,
  });
});

test("pagination clamps requests beyond the available pages", () => {
  assert.deepEqual(getPageWindow(18, 8, 99), {
    totalPages: 3,
    currentPage: 3,
    startIndex: 16,
    endIndex: 18,
  });
});

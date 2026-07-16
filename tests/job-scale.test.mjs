import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD } from "../lib/jobs/constants.ts";
import { getFullCollectionScaleWarning } from "../lib/jobs/scale.ts";

test("full-collection loading stays quiet below the personal-scale threshold", () => {
  assert.equal(getFullCollectionScaleWarning(PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD - 1), null);
});

test("full-collection loading becomes explicit at the personal-scale threshold", () => {
  const warning = getFullCollectionScaleWarning(PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD);

  assert.match(warning, /loads all 1,000 applications/);
  assert.match(warning, /complete history/);
});

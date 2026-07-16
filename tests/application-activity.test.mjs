import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityYears,
  getApplicationActivity,
  getDateKey,
  getGrowthTreeProgress,
  getHeatmapLevel,
  getMonthGridColumn,
  getYearActivityStats,
  getYearDays,
} from "../lib/jobs/activity.ts";

const job = (id, date) => ({
  id,
  date,
  title: "Designer",
  company: "Acme",
  url: "",
  status: "Applied",
  notes: "",
});

test("application activity aggregates dates and yearly totals", () => {
  const activity = getApplicationActivity([
    job("1", "2026-01-03"),
    job("2", "2026-01-03"),
    job("3", "2026-02-14"),
    job("4", "2025-12-01"),
  ]);

  assert.deepEqual(activity, {
    "2026-01-03": 2,
    "2026-02-14": 1,
    "2025-12-01": 1,
  });
  assert.deepEqual(getYearActivityStats(activity, 2026), { applications: 3, activeDays: 2 });
});

test("activity years are valid, unique, current, and newest first", () => {
  assert.deepEqual(
    getActivityYears([job("1", "2024-03-01"), job("2", "2026-04-01"), job("3", "invalid")], 2025),
    [2026, 2025, 2024],
  );
});

test("year grid covers 53 complete weeks", () => {
  const days = getYearDays(2026);
  assert.equal(days.length, 371);
  assert.equal(getDateKey(days[0]), "2025-12-28");
  assert.equal(days[0].getDay(), 0);
  assert.equal(getMonthGridColumn(2026, 0), 1);
  assert.ok(getMonthGridColumn(2026, 11) > getMonthGridColumn(2026, 0));
});

test("heat-map intensity follows the application thresholds", () => {
  assert.deepEqual([-1, 0, 1, 2, 3, 4, 5].map(getHeatmapLevel), [0, 0, 1, 2, 3, 3, 4]);
});

test("growth tree advances through stages and caps at a full canopy", () => {
  assert.deepEqual(
    [0, 1, 3, 7, 12, 20].map((total) => getGrowthTreeProgress(total).stage.name),
    ["Seed", "Seedling", "Sprout", "Sapling", "Young tree", "Canopy"],
  );
  assert.equal(getGrowthTreeProgress(7).growthPercent, 35);
  assert.equal(getGrowthTreeProgress(99).growthPercent, 100);
  assert.equal(getGrowthTreeProgress(-3).growthPercent, 0);
});

import type { Job } from "./types";

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export const GROWTH_TREE_STAGES = [
  { minimum: 0, name: "Seed", description: "Every search starts with a seed." },
  { minimum: 1, name: "Seedling", description: "Your first application has broken ground." },
  { minimum: 3, name: "Sprout", description: "A steady rhythm is taking root." },
  { minimum: 7, name: "Sapling", description: "Your pipeline is growing branches." },
  { minimum: 12, name: "Young tree", description: "Your search now has visible momentum." },
  { minimum: 20, name: "Canopy", description: "A mature pipeline with deep roots." },
] as const;

export const FULL_CANOPY_APPLICATIONS = GROWTH_TREE_STAGES.at(-1)?.minimum ?? 20;

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getYearDays(year: number) {
  const first = new Date(year, 0, 1);
  const gridStart = new Date(year, 0, 1 - first.getDay());

  return Array.from({ length: 371 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function getApplicationActivity(jobs: Job[]) {
  return jobs.reduce<Record<string, number>>((counts, job) => {
    if (job.date) counts[job.date] = (counts[job.date] ?? 0) + 1;
    return counts;
  }, {});
}

export function getActivityYears(jobs: Job[], currentYear = new Date().getFullYear()) {
  const years = jobs.flatMap((job) => {
    const match = /^(\d{4})-\d{2}-\d{2}$/.exec(job.date);
    return match ? [Number(match[1])] : [];
  });

  return Array.from(new Set([currentYear, ...years])).sort((a, b) => b - a);
}

export function getYearActivityStats(activity: Record<string, number>, year: number) {
  return Object.entries(activity).reduce(
    (stats, [date, count]) => {
      if (date.startsWith(`${year}-`) && count > 0) {
        stats.applications += count;
        stats.activeDays += 1;
      }
      return stats;
    },
    { applications: 0, activeDays: 0 },
  );
}

export function getHeatmapLevel(count: number): HeatmapLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export function getMonthGridColumn(year: number, month: number) {
  const januaryFirst = Date.UTC(year, 0, 1);
  const gridStart = Date.UTC(year, 0, 1 - new Date(januaryFirst).getUTCDay());
  const monthStart = Date.UTC(year, month, 1);
  return Math.floor((monthStart - gridStart) / 604_800_000) + 1;
}

export function getGrowthTreeProgress(totalApplications: number) {
  const total = Math.max(0, totalApplications);
  const stageIndex = GROWTH_TREE_STAGES.reduce(
    (currentIndex, stage, index) => (total >= stage.minimum ? index : currentIndex),
    0,
  );

  return {
    stageIndex,
    stage: GROWTH_TREE_STAGES[stageIndex],
    growthPercent: Math.min(100, Math.round((total / FULL_CANOPY_APPLICATIONS) * 100)),
  };
}

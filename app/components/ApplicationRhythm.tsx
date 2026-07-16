"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  FULL_CANOPY_APPLICATIONS,
  getActivityYears,
  getApplicationActivity,
  getDateKey,
  getGrowthTreeProgress,
  getHeatmapLevel,
  getMonthGridColumn,
  getYearActivityStats,
  getYearDays,
} from "@/lib/jobs/activity";
import type { Job } from "@/lib/jobs/types";

export function ApplicationRhythm({ jobs }: { jobs: Job[] }) {
  const [activityYear, setActivityYear] = useState(new Date().getFullYear());
  const totalApplications = jobs.length;
  const tree = getGrowthTreeProgress(totalApplications);
  const treeStyle = { "--growth": `${tree.growthPercent}%` } as CSSProperties;
  const activityYears = useMemo(() => getActivityYears(jobs), [jobs]);
  const activity = useMemo(() => getApplicationActivity(jobs), [jobs]);
  const heatmapDays = useMemo(() => getYearDays(activityYear), [activityYear]);
  const yearStats = useMemo(() => getYearActivityStats(activity, activityYear), [activity, activityYear]);

  return (
    <section className="activitySection" aria-labelledby="activity-title">
      <div className="activityHeader">
        <div>
          <p className="eyebrow">APPLICATION RHYTHM</p>
          <h2 id="activity-title">Your year in applications</h2>
          <p>
            {yearStats.applications} {yearStats.applications === 1 ? "application" : "applications"} across{" "}
            {yearStats.activeDays} active {yearStats.activeDays === 1 ? "day" : "days"}
          </p>
        </div>
        <label className="yearPicker">
          <span>Year</span>
          <select value={activityYear} onChange={(event) => setActivityYear(Number(event.target.value))}>
            {activityYears.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="heatmapScroll">
        <div className="heatmapFrame">
          <div className="monthLabels" aria-hidden="true">
            {Array.from({ length: 12 }, (_, month) => {
              const monthStart = new Date(activityYear, month, 1);
              return (
                <span key={month} style={{ gridColumn: getMonthGridColumn(activityYear, month) }}>
                  {monthStart.toLocaleDateString(undefined, { month: "short" })}
                </span>
              );
            })}
          </div>
          <div className="heatmapBody">
            <div className="weekdayLabels" aria-hidden="true">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="heatmapGrid" role="grid" aria-label={`${activityYear} job application activity`}>
              {heatmapDays.map((day) => {
                const key = getDateKey(day);
                const count = activity[key] || 0;
                const inYear = day.getFullYear() === activityYear;
                const level = getHeatmapLevel(count);
                const label = `${day.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}: ${count} ${count === 1 ? "application" : "applications"}`;
                return (
                  <span
                    key={key}
                    className={`heatDay level-${level}${inYear ? "" : " outsideYear"}`}
                    title={inYear ? label : ""}
                    role="gridcell"
                    aria-label={inYear ? label : undefined}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="heatmapFooter">
        <span>Each square is one day</span>
        <div className="legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`heatDay level-${level}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className={`growthTreeCard growth-stage-${tree.stageIndex}`} style={treeStyle}>
        <div className="growthTreeCopy">
          <p className="eyebrow">APPLICATION GROWTH</p>
          <h3>Your search tree</h3>
          <p>
            {totalApplications} cumulative {totalApplications === 1 ? "application" : "applications"} planted so far.
            {` ${tree.stage.description}`}
          </p>
          <div className="growthMeter" aria-hidden="true">
            <span />
          </div>
          <small>
            {tree.stage.name} stage · grows toward a full canopy at {FULL_CANOPY_APPLICATIONS} applications
          </small>
        </div>
        <div
          className="growthTreeVisual"
          role="img"
          aria-label={`Application growth tree showing ${totalApplications} cumulative applications at the ${tree.stage.name} stage`}
        >
          <span className="soil" />
          <span className="seed" />
          <span className="trunk" />
          <span className="branch branch-left" />
          <span className="branch branch-right" />
          <span className="branch branch-high-left" />
          <span className="branch branch-high-right" />
          <span className="leaf leaf-1" />
          <span className="leaf leaf-2" />
          <span className="leaf leaf-3" />
          <span className="leaf leaf-4" />
          <span className="leaf leaf-5" />
          <span className="leaf leaf-6" />
          <span className="leaf leaf-7" />
          <span className="leaf leaf-8" />
        </div>
      </div>
    </section>
  );
}

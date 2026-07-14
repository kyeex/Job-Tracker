"use client";

import { useMemo, useState } from "react";
import type { Job } from "@/lib/jobs/types";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function yearDays(year: number) {
  const first = new Date(year, 0, 1);
  const start = new Date(year, 0, 1 - first.getDay());
  return Array.from({ length: 371 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function ApplicationRhythm({ jobs }: { jobs: Job[] }) {
  const [activityYear, setActivityYear] = useState(new Date().getFullYear());
  const activityYears = useMemo(
    () =>
      Array.from(new Set([new Date().getFullYear(), ...jobs.map((job) => Number(job.date.slice(0, 4)))]))
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => b - a),
    [jobs],
  );
  const activity = useMemo(
    () =>
      jobs.reduce<Record<string, number>>((counts, job) => {
        counts[job.date] = (counts[job.date] || 0) + 1;
        return counts;
      }, {}),
    [jobs],
  );
  const heatmapDays = useMemo(() => yearDays(activityYear), [activityYear]);
  const yearApplications = jobs.filter((job) => job.date.startsWith(`${activityYear}-`)).length;
  const activeDays = Object.entries(activity).filter(
    ([date, count]) => date.startsWith(`${activityYear}-`) && count > 0,
  ).length;

  return (
    <section className="activitySection" aria-labelledby="activity-title">
      <div className="activityHeader">
        <div>
          <p className="eyebrow">APPLICATION RHYTHM</p>
          <h2 id="activity-title">Your year in applications</h2>
          <p>
            {yearApplications} {yearApplications === 1 ? "application" : "applications"} across {activeDays} active{" "}
            {activeDays === 1 ? "day" : "days"}
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
              const janFirst = new Date(activityYear, 0, 1);
              const gridStart = new Date(activityYear, 0, 1 - janFirst.getDay());
              const monthStart = new Date(activityYear, month, 1);
              const week = Math.floor((monthStart.getTime() - gridStart.getTime()) / 604800000) + 1;
              return (
                <span key={month} style={{ gridColumn: week }}>
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
                const key = dateKey(day);
                const count = activity[key] || 0;
                const inYear = day.getFullYear() === activityYear;
                const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
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
    </section>
  );
}

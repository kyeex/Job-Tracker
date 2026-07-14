import type { Job } from "@/lib/jobs/types";

export function DashboardStats({ jobs }: { jobs: Job[] }) {
  const activeCount = jobs.filter((job) => job.status === "Applied" || job.status === "Interview").length;
  const interviewCount = jobs.filter((job) => job.status === "Interview").length;

  return (
    <section className="stats" aria-label="Application summary">
      <div className="statCard accent">
        <span className="statIcon">↗</span>
        <div>
          <strong>{jobs.length}</strong>
          <span>Total applications</span>
        </div>
        <small>All time</small>
      </div>
      <div className="statCard">
        <span className="statIcon warm">◎</span>
        <div>
          <strong>{activeCount}</strong>
          <span>Active pursuits</span>
        </div>
        <small>Keep going</small>
      </div>
      <div className="statCard">
        <span className="statIcon blue">◇</span>
        <div>
          <strong>{interviewCount}</strong>
          <span>Interviews</span>
        </div>
        <small>{interviewCount ? "Great momentum" : "Coming soon"}</small>
      </div>
      <div className="statCard quote">
        <p>“Success is the sum of small efforts, repeated day in and day out.”</p>
        <span>— Robert Collier</span>
      </div>
    </section>
  );
}

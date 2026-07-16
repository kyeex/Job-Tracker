import type { JobImportRecord, JobInput, JobUpdateInput, PersistedJob } from "./types";

export type JobImportResult = {
  imported: number;
  created: number;
  updated: number;
  batches: number;
};

export interface JobsRepository {
  list(): Promise<PersistedJob[]>;
  create(input: JobInput): Promise<PersistedJob>;
  update(id: string, input: JobUpdateInput): Promise<PersistedJob | null>;
  remove(id: string): Promise<void>;
  import(records: JobImportRecord[]): Promise<JobImportResult>;
}

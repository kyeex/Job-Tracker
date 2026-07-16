import type { JobImportRecord, JobPayload } from "./types";
import { requireValidJobInput } from "./validation.ts";

export const FIRESTORE_IMPORT_BATCH_SIZE = 400;

export type PreparedJobImport = {
  id: string;
  values: JobPayload;
  createdAt?: string;
};

function stableHash(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function stableImportId(values: JobPayload) {
  const fingerprint = JSON.stringify([
    values.dateApplied,
    values.jobTitle,
    values.company,
    values.jobUrl,
    values.status,
    values.notes,
  ]);
  return `import-${stableHash(fingerprint, 2166136261)}${stableHash(fingerprint, 2246822519)}`;
}

function validateExplicitId(id: string, context: string) {
  if (
    id.includes("/") ||
    id === "." ||
    id === ".." ||
    /^__.*__$/.test(id) ||
    new TextEncoder().encode(id).byteLength > 1_500
  ) {
    throw new Error(`${context} has an invalid application ID.`);
  }
}

export function prepareJobImports(records: JobImportRecord[]): PreparedJobImport[] {
  const validated = records.map((record, index) => {
    const context = `Imported application ${index + 1}`;
    const explicitId = record.id?.trim() || "";
    if (explicitId) validateExplicitId(explicitId, context);
    const values = requireValidJobInput(record, context);

    return {
      explicitId,
      baseId: explicitId || stableImportId(values),
      values,
      createdAt: record.createdAt,
    };
  });
  const usedIds = new Set<string>();
  const occurrenceByBaseId = new Map<string, number>();

  for (const record of validated) {
    if (!record.explicitId) continue;
    if (usedIds.has(record.explicitId)) {
      throw new Error(`Import contains the duplicate application ID "${record.explicitId}".`);
    }
    usedIds.add(record.explicitId);
  }

  return validated.map((record) => {
    if (record.explicitId) {
      return { id: record.explicitId, values: record.values, createdAt: record.createdAt };
    }

    let occurrence = (occurrenceByBaseId.get(record.baseId) ?? 0) + 1;
    let id = occurrence === 1 ? record.baseId : `${record.baseId}-${occurrence}`;
    while (usedIds.has(id)) {
      occurrence += 1;
      id = `${record.baseId}-${occurrence}`;
    }
    occurrenceByBaseId.set(record.baseId, occurrence);
    usedIds.add(id);
    return { id, values: record.values, createdAt: record.createdAt };
  });
}

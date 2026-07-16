import { PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD } from "./constants.ts";

export function getFullCollectionScaleWarning(applicationCount: number) {
  if (applicationCount < PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD) {
    return null;
  }

  return `This personal-scale view loads all ${applicationCount.toLocaleString()} applications so filters, activity, and exports use your complete history. Consider archiving older records if loading becomes slow.`;
}

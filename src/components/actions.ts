"use server";

import { getActiveStatRangeDTOs } from "@/lib/data/statrange-dto";

export async function getActiveStatRanges() {
  return await getActiveStatRangeDTOs();
}

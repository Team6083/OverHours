import { getAllStatRangeDTOs } from "@/lib/data/statrange-dto";
import StatRangesTable from "./StatRangesTable";

export default async function StatRangesPage() {
  const statRanges = await getAllStatRangeDTOs();

  return <StatRangesTable statRanges={statRanges} />;
}

import { getActiveStatRangeDTOs } from "@/lib/data/statrange-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import ReportOverviewContent from "./ReportOverviewContent";

export default async function ReportPage() {
  const [userNames, statRanges] = await Promise.all([getAllUserNames(), getActiveStatRangeDTOs()]);
  const userNameDict = Object.fromEntries(userNames.map(({ id, name }) => [id, name]));

  return <ReportOverviewContent userNameDict={userNameDict} statRanges={statRanges} />;
}

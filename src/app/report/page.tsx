import { getAllUserNames } from "@/lib/data/user-dto";
import ReportOverviewContent from "./ReportOverviewContent";

export default async function ReportPage() {
  const userNames = await getAllUserNames();
  const userNameDict = Object.fromEntries(userNames.map(({ id, name }) => [id, name]));

  return <ReportOverviewContent userNameDict={userNameDict} />;
}

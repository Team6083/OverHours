import { getAllUserNames } from "@/lib/data/user-dto";
import WeeklyReportContent from "./WeeklyReportContent";

export default async function WeeklyReport() {
  const userNames = await getAllUserNames();
  const userNameDict = Object.fromEntries(userNames.map(({ id, name }) => [id, name]));

  return <WeeklyReportContent userNameDict={userNameDict} />;
}

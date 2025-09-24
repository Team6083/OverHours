import { getAllUserNames } from "@/lib/data/user-dto";
import DailyReportContent from "./DailyReportContent";

export default async function DailyReport() {
  const userNames = await getAllUserNames();
  const userNameDict = Object.fromEntries(userNames.map(({ id, name }) => [id, name]));

  return <>
    <DailyReportContent userNameDict={userNameDict} />
  </>
}

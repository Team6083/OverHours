import { auth } from "@/auth";
import { getActiveStatRangeDTOs } from "@/lib/data/statrange-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import UserReportContent from "./UserReportContent";

export default async function UserReportPage() {
  const [session, users, statRanges] = await Promise.all([auth(), getAllUserNames(), getActiveStatRangeDTOs()]);

  return <UserReportContent users={users} statRanges={statRanges} defaultUserId={session?.user?.id ?? ""} />;
}

import { auth } from "@/auth";
import { getAllUserNames } from "@/lib/data/user-dto";
import UserReportContent from "./UserReportContent";

export default async function UserReportPage() {
  const [session, users] = await Promise.all([auth(), getAllUserNames()]);

  return <UserReportContent users={users} defaultUserId={session?.user?.id ?? ""} />;
}

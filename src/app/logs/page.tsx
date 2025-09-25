import { auth, Role } from "@/auth";
import { getAllTimelogDTOs } from "@/lib/data/timelog-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import LogsTable from "./LogsTable";

export default async function LogsPage() {
  const session = await auth();
  const isAdmin = session?.user.role === Role.ADMIN;

  const logs = await getAllTimelogDTOs(isAdmin ? undefined : { userId: session?.user.id });
  const userInfo = Object.fromEntries((await getAllUserNames()).map((user) => [user.id, { name: user.name }]));

  return <>
    <LogsTable logs={logs} userInfo={userInfo} showAdminActions={isAdmin} />
  </>
}

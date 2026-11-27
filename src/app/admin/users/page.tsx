import { getOutOfSyncEmails } from "@/lib/data/account-dto";
import { getAllUserDTOs } from "@/lib/data/user-dto";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  const [users, providerEmails] = await Promise.all([getAllUserDTOs(), getOutOfSyncEmails()]);

  return <UsersTable users={users} outOfSyncEmails={providerEmails} />;
}

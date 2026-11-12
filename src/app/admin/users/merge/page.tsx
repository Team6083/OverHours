import Link from "next/link";
import { Button, Card } from "@chakra-ui/react";

import { auth } from "@/auth";
import { getMergePreview } from "@/lib/data/user-merge";
import MergeUsersConfirm from "./MergeUsersConfirm";

export default async function MergeUsersPage(props: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await props.searchParams;
  const ids = Array.from(new Set((idsParam ?? "").split(",").filter(Boolean)));

  const preview = ids.length >= 2 ? await getMergePreview(ids) : null;
  if (!preview) {
    return <Card.Root variant="elevated">
      <Card.Body>Select at least two existing users to merge.</Card.Body>
      <Card.Footer>
        <Button size="sm" variant="outline" asChild><Link href="/admin/users">Back to Users</Link></Button>
      </Card.Footer>
    </Card.Root>;
  }

  const session = await auth();

  return <MergeUsersConfirm preview={preview} currentUserId={session?.user.id} />;
}

import Link from "next/link";
import { HStack, Button, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { getTimelogDTO } from "@/lib/data/timelog-dto";
import { getAllUserDTOs } from "@/lib/data/user-dto";
import LogForm from "./form";

export default async function SingleUserPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const users = (await getAllUserDTOs()).map((user) => ({ label: user.name, value: user.id }));

  const isNew = id === "new";
  const timeLogDTO = !isNew ? await getTimelogDTO(id) : null;

  return (<>
    <HStack mb={4} justifyContent="space-between">
      <Button size="xs" variant="ghost" asChild>
        <Link href="/logs">
          <Icon><LuArrowLeft /></Icon>
          Back to Logs
        </Link>
      </Button>

      {timeLogDTO &&
        <IconButton size="xs" variant="ghost" colorPalette="red" asChild><Link href={`/logs/${timeLogDTO?.id}/delete`}>
          <Icon><LuTrash2 /></Icon>
        </Link></IconButton>
      }
    </HStack>

    <LogForm isNew={isNew} timeLog={timeLogDTO ?? undefined} userOptions={users} />
  </>);
}

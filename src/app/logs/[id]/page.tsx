import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button, Container, HStack, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { auth, Role } from "@/auth";
import DeleteTimeLogsDialog from "@/components/timelog/DeleteTimeLogsDialog";
import { getTimelogDTO } from "@/lib/data/timelog-dto";
import { getAllUserDTOs } from "@/lib/data/user-dto";
import { handleDeleteLogs } from "../actions";
import LogForm from "./form";

export default async function SingleUserPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;
  const t = await getTranslations("LogEditPage");
  const session = await auth();

  const users = (await getAllUserDTOs()).map((user) => ({ label: user.name, value: user.id }));

  const isNew = id === "new";
  const timeLogDTO = !isNew ? await getTimelogDTO(id) : null;

  return (<>
    <HStack mb={4} justifyContent="space-between">
      <Button size="xs" variant="ghost" asChild>
        <Link href="/logs">
          <Icon><LuArrowLeft /></Icon>
          {t("buttons.backToLogs")}
        </Link>
      </Button>

      {/* Members can open their own logs, but only admins can delete them. */}
      {timeLogDTO && session?.user.role === Role.ADMIN &&
        <DeleteTimeLogsDialog
          logs={[timeLogDTO]}
          userNames={{ [timeLogDTO.userId]: users.find(user => user.value === timeLogDTO.userId)?.label }}
          onDelete={handleDeleteLogs}
          redirectTo="/logs"
          trigger={<IconButton size="xs" variant="ghost" colorPalette="red" aria-label="Delete">
            <Icon><LuTrash2 /></Icon>
          </IconButton>}
        />
      }
    </HStack>

    <Container>
      <LogForm isNew={isNew} timeLog={timeLogDTO ?? undefined} userOptions={users} />
    </Container>
  </>);
}

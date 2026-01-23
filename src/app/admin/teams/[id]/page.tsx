import Link from "next/link";
import { Button, Container, HStack, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { getTeamDTO } from "@/lib/data/team-dto";
import TeamForm from "./form";

export default async function SingleTeamPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const isNew = id === "new";

  const teamDTO = isNew ? null : await getTeamDTO(id);
  if (!isNew && !teamDTO) {
    return <Container maxWidth="lg">Team not found</Container>;
  }

  return (<>
    <HStack mb={4} justifyContent="space-between">
      <Button size="xs" variant="ghost" asChild>
        <Link href="/admin/teams">
          <Icon><LuArrowLeft /></Icon>
          Back to Teams
        </Link>
      </Button>

      {teamDTO && <IconButton size="xs" variant="ghost" colorPalette="red" asChild><Link href={`/admin/teams/${teamDTO.id}/delete`}>
        <Icon><LuTrash2 /></Icon>
      </Link></IconButton>}
    </HStack>

    <Container>
      <TeamForm isNew={isNew} team={teamDTO ?? undefined} />
    </Container>
  </>);
}

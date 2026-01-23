import { getTeamDTO } from "@/lib/data/team-dto";
import { DataList, Editable, EmptyState, IconButton, VStack } from "@chakra-ui/react";
import { LuPencilLine, LuX, LuCheck, LuSearchX } from "react-icons/lu";
import { updateTeamName } from "./actions";

export default async function TeamPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const team = await getTeamDTO(id);

  return <>
    {team ? <>
      <DataList.Root orientation="horizontal">
        <DataList.Item>
          <DataList.ItemLabel>ID</DataList.ItemLabel>
          <DataList.ItemValue><code>{team.id}</code></DataList.ItemValue>
        </DataList.Item>

        <DataList.Item>
          <DataList.ItemLabel>Name</DataList.ItemLabel>
          <DataList.ItemValue>
            <Editable.Root size="sm" defaultValue={team.name} onValueCommit={async (v) => {
              "use server";
              return updateTeamName(id, v.value);
            }}>
              <Editable.Preview />
              <Editable.Input />
              <Editable.Control>
                <Editable.EditTrigger asChild>
                  <IconButton variant="ghost" size="xs">
                    <LuPencilLine />
                  </IconButton>
                </Editable.EditTrigger>
                <Editable.CancelTrigger asChild>
                  <IconButton variant="outline" size="xs">
                    <LuX />
                  </IconButton>
                </Editable.CancelTrigger>
                <Editable.SubmitTrigger asChild>
                  <IconButton variant="outline" size="xs">
                    <LuCheck />
                  </IconButton>
                </Editable.SubmitTrigger>
              </Editable.Control>
            </Editable.Root>
          </DataList.ItemValue>
        </DataList.Item>

        <DataList.Item>
          <DataList.ItemLabel>Created At</DataList.ItemLabel>
          <DataList.ItemValue>{team.createdAt.toLocaleString()}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Updated At</DataList.ItemLabel>
          <DataList.ItemValue>{team.updatedAt.toLocaleString()}</DataList.ItemValue>
        </DataList.Item>
      </DataList.Root>
    </> :
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuSearchX />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>Team not found</EmptyState.Title>
            <EmptyState.Description>
              We couldn{"'"}t find a team with the ID &quot;{id}&quot;.
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    }
  </>;
}

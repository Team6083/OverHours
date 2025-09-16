"use client";

import { ButtonGroup, Center, IconButton, Pagination, Table, usePaginationContext } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight, LuDoorOpen, LuLock, LuTrash2 } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";

export type CurrentlyInItem = {
  id: string;
  user: string;
  inTime: Date;
};

export default function CurrentlyInTable(props: {
  items: CurrentlyInItem[],
  handleClockout?: (id: string) => void,
  handleLock?: (id: string) => void,
  handleRemove?: (id: string) => void,
}) {
  const { items } = props;

  const { page, pageSize } = usePaginationContext();

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);

  return <>
    <Table.Root size="md" interactive>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>User</Table.ColumnHeader>
          <Table.ColumnHeader>Clocked-in Time</Table.ColumnHeader>
          <Table.ColumnHeader>Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {currentItems.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.user}</Table.Cell>
            <Table.Cell>{item.inTime.toLocaleString()}</Table.Cell>
            <Table.Cell>
              <ButtonGroup variant="ghost" size="xs" gap={0}>
                <Tooltip content="Clock-out User"><IconButton colorPalette="blue" onClick={() => props.handleClockout?.(item.id)}><LuDoorOpen /></IconButton></Tooltip>
                <Tooltip content="Lock User"><IconButton colorPalette="orange" onClick={() => props.handleLock?.(item.id)}><LuLock /></IconButton></Tooltip>
                <Tooltip content="Remove Log"><IconButton colorPalette="red" onClick={() => props.handleRemove?.(item.id)}><LuTrash2 /></IconButton></Tooltip>
              </ButtonGroup>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>

    <Center mt={4}>
      <ButtonGroup variant="ghost" size="xs" wrap="wrap">
        <Pagination.PrevTrigger asChild>
          <IconButton>
            <LuChevronLeft />
          </IconButton>
        </Pagination.PrevTrigger>

        <Pagination.Items
          render={(page) => (
            <IconButton variant={{ base: "ghost", _selected: "outline" }}>
              {page.value}
            </IconButton>
          )}
        />

        <Pagination.NextTrigger asChild>
          <IconButton>
            <LuChevronRight />
          </IconButton>
        </Pagination.NextTrigger>
      </ButtonGroup>
    </Center>
  </>
}

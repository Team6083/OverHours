"use client";

import { ButtonGroup, IconButton, Table, usePaginationContext } from "@chakra-ui/react";
import { LuDoorOpen, LuLock, LuTrash2 } from "react-icons/lu";

export type CurrentlyInItem = {
  id: number;
  user: string;
  inTime: Date;
};

export default function CurrentlyInTable(props: { items: CurrentlyInItem[] }) {
  const { items } = props;

  const { page, pageSize } = usePaginationContext();

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);

  return <Table.Root size="md" interactive>
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
              <IconButton colorPalette="yellow"><LuDoorOpen /></IconButton>
              <IconButton colorPalette="orange"><LuLock /></IconButton>
              <IconButton colorPalette="red"><LuTrash2 /></IconButton>
            </ButtonGroup>
          </Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table.Root>;
}

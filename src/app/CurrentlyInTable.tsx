"use client";
import { useTranslations } from "next-intl";
import { ButtonGroup, Center, ClientOnly, IconButton, Pagination, Table, usePaginationContext } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight, LuDoorOpen, LuLock, LuTrash2 } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";

export type CurrentlyInItem = {
  id: string;
  user: string;
  inTime: Date;
};

export default function CurrentlyInTable(props: {
  items: CurrentlyInItem[],
  showAdminActions?: boolean,
  handleClockout?: (id: string) => void,
  handleLock?: (id: string) => void,
  handleRemove?: (id: string) => void,
}) {
  const {
    items, showAdminActions,
    handleClockout,
    handleLock,
    handleRemove,
  } = props;
  const t = useTranslations("HomePage.currentlyInTable");

  const { page, pageSize } = usePaginationContext();

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);

  return <>
    <Table.Root size="md" interactive>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>{t("header.user")}</Table.ColumnHeader>
          <Table.ColumnHeader>{t("header.inTime")}</Table.ColumnHeader>
          <Table.ColumnHeader hidden={!showAdminActions}>{t("header.actions")}</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {currentItems.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.user}</Table.Cell>
            <Table.Cell>
              <ClientOnly>{item.inTime.toLocaleString()}</ClientOnly>
            </Table.Cell>
            <Table.Cell hidden={!showAdminActions}>
              <ButtonGroup variant="ghost" size="xs" gap={0}>
                <Tooltip content={t("actions.forceClockOut")}><IconButton colorPalette="blue" onClick={() => handleClockout?.(item.id)}><LuDoorOpen /></IconButton></Tooltip>
                <Tooltip content={t("actions.lockUser")}><IconButton colorPalette="orange" onClick={() => handleLock?.(item.id)}><LuLock /></IconButton></Tooltip>
                <Tooltip content={t("actions.removeLog")}><IconButton colorPalette="red" onClick={() => handleRemove?.(item.id)}><LuTrash2 /></IconButton></Tooltip>
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

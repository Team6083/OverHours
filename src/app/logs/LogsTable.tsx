"use client";
import { ComponentProps, useMemo, useState } from "react";

import { Table, Checkbox, ButtonGroup, IconButton, Icon, Stack, Pagination, HStack, Text, Select, Portal, createListCollection, Badge, usePaginationContext } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowUp10, LuChevronLeft, LuChevronRight, LuFilter, LuLock, LuPen, LuTimer, LuTrash2 } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip"

export type TimeLog = {
  id: string;
  user: string;
  inTime: Date;
  outTime?: Date;
  isLocked?: boolean;
  notes?: string;
}

export type UserInfo = Map<string, { name: string; avatarUrl?: string }>;

const itemsPerPage = createListCollection({
  items: [
    { label: "10", value: "10" },
    { label: "25", value: "25" },
    { label: "50", value: "50" },
    { label: "100", value: "100" },
  ],
})

export default function LogsTable(props: {
  logs: TimeLog[];
  userInfo: UserInfo;
} & ComponentProps<typeof Stack>) {
  const { logs, userInfo, ...stackProps } = props;

  const [sortBy, setSortBy] = useState<[string, 1 | -1] | null>(["time", 1]);

  const { pageSize, pageRange, setPageSize } = usePaginationContext();

  const tableData = useMemo(() => {
    return logs
      .map((log) => {
        const user = userInfo.get(log.user);

        let durationStr = "N/A";
        if (log.outTime) {
          const durationMs = log.outTime.getTime() - log.inTime.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          durationStr = `${hours}h ${minutes}m`;
        }

        return {
          ...log,
          displayName: user?.name || log.user,
          avatarUrl: user?.avatarUrl,
          inTimeStr: log.inTime.toLocaleString(),
          outTimeStr: log.outTime ? log.outTime.toLocaleString() : "N/A",
          durationStr,
        };
      })
      .sort((a, b) => {
        if (!sortBy) return 0;
        const [key, order] = sortBy;

        if (key === "time") {
          // Sort by inTime first, then outTime
          if (a.inTime.getTime() !== b.inTime.getTime()) {
            return (a.inTime.getTime() < b.inTime.getTime() ? -1 : 1) * order;
          }

          if (a.outTime && b.outTime) {
            return (a.outTime.getTime() < b.outTime.getTime() ? -1 : 1) * order;
          }
          if (a.outTime && !b.outTime) return 1 * order; // a is "greater" if it has outTime
          if (!a.outTime && b.outTime) return -1 * order; // b is "greater" if it has outTime
          return 0;
        }

        let aValue: string | number = "";
        let bValue: string | number = "";

        if (key === "user") {
          aValue = a.displayName;
          bValue = b.displayName;
        } else if (key === "duration") {
          aValue = a.outTime ? a.outTime.getTime() - a.inTime.getTime() : 0;
          bValue = b.outTime ? b.outTime.getTime() - b.inTime.getTime() : 0;
        }

        return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * order;
      })
      .slice(pageRange.start, pageRange.end);
  }, [logs, pageRange.start, pageRange.end, userInfo, sortBy]);

  return <Stack gap={4} {...stackProps}>
    <HStack px={2}>
      <Select.Root collection={itemsPerPage} size="xs" maxW="60px" value={[pageSize.toString()]} onValueChange={({ value }) => setPageSize(parseInt(value[0], 10))}>
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select framework" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {itemsPerPage.items.map((item) => (
                <Select.Item item={item} key={item.value}>
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
      <Text fontSize="sm" fontWeight="medium">
        entries per page
      </Text>
    </HStack>

    <Table.ScrollArea>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>
              <Checkbox.Root
                size="sm"
                mt="0.5"
                aria-label="Select all rows"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Table.ColumnHeader>
            <Table.ColumnHeader onClick={() => setSortBy(sortBy?.[1] === 1 ? ["user", -1] : ["user", 1])} cursor="pointer">
              User
              {sortBy?.[0] === "user"
                && (sortBy[1] === 1
                  ? <Icon ml={1}><LuArrowDown01 /></Icon>
                  : <Icon ml={1}><LuArrowUp10 /></Icon>)
              }
              <IconButton size="2xs" ml={2} variant="ghost" disabled><LuFilter /></IconButton>
            </Table.ColumnHeader>
            <Table.ColumnHeader colSpan={2} onClick={() => setSortBy(sortBy?.[1] === 1 ? ["time", -1] : ["time", 1])} cursor="pointer">
              Clock-in / out Time
              {sortBy?.[0] === "time"
                && (sortBy[1] === 1
                  ? <Icon ml={1}><LuArrowDown01 /></Icon>
                  : <Icon ml={1}><LuArrowUp10 /></Icon>)
              }
            </Table.ColumnHeader>
            <Table.ColumnHeader onClick={() => setSortBy(sortBy?.[1] === 1 ? ["duration", -1] : ["duration", 1])} cursor="pointer">
              Duration
              {sortBy?.[0] === "duration"
                && (sortBy[1] === 1
                  ? <Icon ml={1}><LuArrowDown01 /></Icon>
                  : <Icon ml={1}><LuArrowUp10 /></Icon>)
              }
            </Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tableData.map((v) => (
            <Table.Row key={v.id}>
              <Table.Cell>
                <Checkbox.Root
                  size="sm"
                  mt="0.5"
                  aria-label="Select row"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.Cell>
              <Table.Cell>{v.displayName}</Table.Cell>
              <Table.Cell>{v.inTimeStr}</Table.Cell>
              <Table.Cell>
                {v.outTime
                  ? (
                    v.isLocked
                      ? <Tooltip content={`Clocked-out at ${v.outTimeStr}`}>
                        <Badge colorPalette="red" mr={2}>
                          <Icon><LuLock /></Icon>
                          Locked
                        </Badge>
                      </Tooltip>
                      : v.outTimeStr)
                  : <Badge colorPalette="orange">
                    <Icon><LuTimer /></Icon>
                    In Progress
                  </Badge>}
              </Table.Cell>
              <Table.Cell color={v.isLocked ? "fg.muted" : undefined} textDecor={v.isLocked ? "line-through" : undefined}>
                {v.outTime ? v.durationStr : null}
              </Table.Cell>
              <Table.Cell>
                <ButtonGroup size="xs" variant="ghost">
                  <IconButton><Icon><LuPen /></Icon></IconButton>
                  <IconButton colorPalette="red"><Icon><LuTrash2 /></Icon></IconButton>
                </ButtonGroup>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>

    <HStack justify={{ base: "space-around", md: "space-between" }} px={2} flexWrap="wrap">
      <StatText as="span" fontSize="sm" fontWeight="medium" color="fg.muted" />
      <PaginationButtons />
    </HStack>
  </Stack>;
}

function StatText(props: ComponentProps<typeof Text>) {
  const { count, pageRange } = usePaginationContext();

  return <Text {...props}>
    Showing {pageRange.start + 1} to {pageRange.end} of {count} entries
    {/* (filtered from {count} total entries) */}
  </Text>;
}

function PaginationButtons() {
  return <>
    <ButtonGroup variant="ghost" size="sm" wrap="wrap" hideBelow="sm">
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

    <ButtonGroup variant="ghost" size="sm" wrap="wrap" hideFrom="sm">
      <Pagination.PrevTrigger asChild>
        <IconButton>
          <LuChevronLeft />
        </IconButton>
      </Pagination.PrevTrigger>

      <Pagination.PageText />

      <Pagination.NextTrigger asChild>
        <IconButton>
          <LuChevronRight />
        </IconButton>
      </Pagination.NextTrigger>
    </ButtonGroup>
  </>;
}

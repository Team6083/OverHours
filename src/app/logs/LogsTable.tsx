"use client";
import { ComponentProps, useMemo } from "react";

import { Table, Checkbox, ButtonGroup, IconButton, Icon, Stack, Pagination, HStack, Text, NativeSelect, Select, Portal, createListCollection, Badge } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowDownAZ, LuArrowUp10, LuChevronLeft, LuChevronRight, LuFilter, LuLock, LuPen, LuTimer, LuTrash2 } from "react-icons/lu";

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

export default function LogsTable(props: {
  logs: TimeLog[];
  userInfo: UserInfo;
} & ComponentProps<typeof Stack>) {
  const { logs, userInfo, ...stackProps } = props;

  // const { contains } = useFilter({ sensitivity: "base" })

  // const { collection, filter } = useListCollection({
  //   initialItems: users,
  //   filter: contains,
  // })

  const seasons = createListCollection({
    items: [
      { value: "all", label: "All" },
      { value: "2025-season", label: "2025 Season" },
      { value: "2025-offseason", label: "2025 Offseason" },
      { value: "2026-preseason", label: "2026 Preseason" },
    ],
  });

  const tableData = useMemo(() => {
    return logs.map((log) => {
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
    });
  }, [logs, userInfo]);

  return <Stack gap={4} {...stackProps}>
    <HStack justify="space-between" px={2}>
      <HStack gap={2}>
        <NativeSelect.Root size="xs" maxW="fit-content">
          <NativeSelect.Field>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Text fontSize="sm" fontWeight="medium">
          entries per page
        </Text>
      </HStack>

      {/* <Combobox.Root
        collection={collection}
        onInputValueChange={(e) => filter(e.inputValue)}
        size="xs"
        width="320px"
      >
        <Combobox.Label>Select us</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input placeholder="Type to search" />
          <Combobox.IndicatorGroup>
            <Combobox.ClearTrigger />
            <Combobox.Trigger />
          </Combobox.IndicatorGroup>
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner>
            <Combobox.Content>
              <Combobox.Empty>No items found</Combobox.Empty>
              {collection.items.map((item) => (
                <Combobox.Item item={item} key={item.value}>
                  {item.label}
                  <Combobox.ItemIndicator />
                </Combobox.Item>
              ))}
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.Root> */}

      {/* <Field.Root maxW="1/3">
        <Field.Label>
          Search
        </Field.Label>
        <Input size="xs" placeholder="Enter your search term" />
      </Field.Root> */}

      <Select.Root collection={seasons} size="xs" maxW="160px" defaultValue={["all"]}>
        <Select.HiddenSelect />
        <Select.Label>Select season</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select season" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {seasons.items.map((season) => (
                <Select.Item item={season} key={season.value}>
                  {season.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </HStack>

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
          <Table.ColumnHeader>
            User
            <Icon ml={1}><LuArrowDownAZ /></Icon>
            {/* <Icon ml={1}><LuArrowUpZA /></Icon> */}
            <IconButton size="2xs" ml={2} variant="ghost"><LuFilter /></IconButton>
          </Table.ColumnHeader>
          <Table.ColumnHeader colSpan={2}>
            Clock-in / out Time
            <Icon ml={1}><LuArrowDown01 /></Icon>
            {/* <Icon ml={1}><LuArrowUp10 /></Icon> */}
          </Table.ColumnHeader>
          <Table.ColumnHeader>
            Duration
            {/* <Icon ml={1}><LuArrowDown01 /></Icon> */}
            <Icon ml={1}><LuArrowUp10 /></Icon>
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

    <HStack justify="space-between" px={2}>
      <Text fontSize="sm" color="fg.muted">
        Showing 1 to 10 of 2,672 entries (filtered from 3,006 total entries)
      </Text>

      <Pagination.Root count={20 * 5} pageSize={5} page={1}>
        <ButtonGroup variant="ghost" size="sm" wrap="wrap">
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
      </Pagination.Root>
    </HStack>

  </Stack>;
}

"use client";
import React, { createContext, useContext, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  Badge, ButtonGroup, CloseButton, EmptyState, Icon, IconButton, Input, InputGroup,
  Menu, Pagination, Portal, Spinner, Stack, Table, useFilter, usePaginationContext, VStack
} from "@chakra-ui/react";
import {
  LuArrowUp10, LuBuilding, LuChevronLeft, LuChevronRight, LuDoorOpen,
  LuEllipsisVertical, LuLock, LuSearchSlash, LuTrash2,
} from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";
import { ComponentPropsWithoutChildren } from "@/lib/util";

type CurrentlyClockedInTimeLog = {
  id: string;
  user: string;
  inTime: Date;
};

export interface CurrentlyClockedInContext {
  logs: CurrentlyClockedInTimeLog[];
  filteredLogs: CurrentlyClockedInTimeLog[];

  searchText: string;
  setSearchText: (text: string) => void;

  handleAction: (action: "clockOut" | "lock" | "remove", id: string) => Promise<void>;
}

const currentlyClockedInContext = createContext<CurrentlyClockedInContext | undefined>(undefined);

export function CurrentlyClockedInProvider(props: {
  children: React.ReactNode;

  logs: CurrentlyClockedInContext["logs"];
  handleClockout?: (userId: string) => Promise<void>;
  handleLock?: (userId: string) => Promise<void>;
  handleRemove?: (logId: string) => Promise<void>;
}) {
  const { children, logs, handleClockout, handleLock, handleRemove } = props;

  const filter = useFilter({ sensitivity: "base" });
  const [searchText, setSearchText] = useState("");
  const filteredLogs = logs.filter(log => filter.contains(log.user, searchText));

  const handleAction = async (action: "clockOut" | "lock" | "remove", id: string) => {
    let f: ((userId: string) => Promise<void>) | undefined;
    if (action === "clockOut") f = handleClockout;
    else if (action === "lock") f = handleLock;
    else if (action === "remove") f = handleRemove;

    if (f) {
      try {
        await f(id);
      } catch (e) {
        console.error("Error handling action", e);
      }
    }
  };

  return (
    <currentlyClockedInContext.Provider value={{
      logs,
      filteredLogs,
      searchText,
      setSearchText,
      handleAction,
    }}>
      <Pagination.Root count={filteredLogs.length} pageSize={8} defaultPage={1}>
        {children}
      </Pagination.Root>
    </currentlyClockedInContext.Provider>
  );
}

export function useCurrentlyClockedInContext() {
  const context = useContext(currentlyClockedInContext);
  if (!context) {
    throw new Error("useCurrentlyClockedIn must be used within a CurrentlyClockedInProvider");
  }
  return context;
}

export function CurrentlyClockedInCountBadge(props: ComponentPropsWithoutChildren<typeof Badge>) {
  const { logs } = useCurrentlyClockedInContext();

  return <Badge colorPalette="blue" size="md" {...props}>{logs.length}</Badge>;
}

export function CurrentlyClockedInSearchInput(props: ComponentPropsWithoutChildren<typeof Input>) {
  const { size = "xs" } = props;

  const { searchText, setSearchText } = useCurrentlyClockedInContext();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const endElement = searchText ? (
    <CloseButton
      size={size}
      onClick={() => {
        setSearchText("");
        inputRef.current?.focus();
      }}
      me="-2" mt="-2"
    />
  ) : undefined;

  return (
    <InputGroup endElement={endElement}>
      <Input
        {...props}
        size={size}
        ref={inputRef}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
    </InputGroup>
  );
}

export function CurrentlyClockedInTable(props: {
  showAdminActions?: boolean,
} & ComponentPropsWithoutChildren<typeof Table.Root>) {
  const { showAdminActions, ...tableRootProps } = props;
  const t = useTranslations("HomePage.currentlyInTable");

  const { filteredLogs, handleAction: ctxHandleAction } = useCurrentlyClockedInContext();

  const [pendingAction, setActionPending] = useState<string | null>(null);
  const handleAction = async (action: "clockOut" | "lock" | "remove", id: string) => {
    if (pendingAction) return;
    setActionPending(action);
    try {
      await ctxHandleAction(action, id);
    } finally {
      setActionPending(null);
    }
  }

  if (filteredLogs.length === 0) {
    return (
      <EmptyState.Root size="sm">
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuSearchSlash />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>{t("emptyStates.noSearchResults.title")}</EmptyState.Title>
            <EmptyState.Description>{t("emptyStates.noSearchResults.description")}</EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  const clockOutPending = pendingAction === "clockOut";
  const lockPending = pendingAction === "lock";
  const removePending = pendingAction === "remove";

  return (
    <Table.Root size="md" interactive {...tableRootProps}>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>{t("header.user")}</Table.ColumnHeader>
          <Table.ColumnHeader>{t("header.inTime")} <Icon><LuArrowUp10 /></Icon></Table.ColumnHeader>
          {showAdminActions && <>
            <Table.ColumnHeader hideBelow="sm" >{t("header.actions")}</Table.ColumnHeader>
            <Table.ColumnHeader hideFrom="sm" />
          </>}
        </Table.Row>
      </Table.Header>

      <Pagination.Context>
        {({ page, pageSize }) => {
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const currentItems = filteredLogs.slice(startIndex, endIndex);

          return (
            <Table.Body>
              {currentItems.map((item) => {
                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.user}</Table.Cell>

                    <Table.Cell>
                      {item.inTime.toLocaleString()}
                    </Table.Cell>

                    {showAdminActions ? (<>
                      <Table.Cell hideBelow="sm">
                        <ButtonGroup variant="ghost" size="xs" gap={0}>
                          <Tooltip content={t("actions.forceClockOut")}>
                            <IconButton
                              colorPalette="blue"
                              loading={clockOutPending}
                              disabled={!!pendingAction && !clockOutPending}
                              onClick={() => handleAction("clockOut", item.id)}
                            >
                              <LuDoorOpen />
                            </IconButton>
                          </Tooltip>

                          <Tooltip content={t("actions.lockUser")}>
                            <IconButton
                              colorPalette="orange"
                              loading={lockPending}
                              disabled={!!pendingAction && !lockPending}
                              onClick={() => handleAction("lock", item.id)}
                            >
                              <LuLock />
                            </IconButton>
                          </Tooltip>

                          <Tooltip content={t("actions.removeLog")}>
                            <IconButton
                              colorPalette="red"
                              loading={removePending}
                              disabled={!!pendingAction && !removePending}
                              onClick={() => handleAction("remove", item.id)}
                            >
                              <LuTrash2 />
                            </IconButton>
                          </Tooltip>
                        </ButtonGroup>
                      </Table.Cell>

                      <Table.Cell hideFrom="sm">
                        <Menu.Root onSelect={({ value }) => handleAction(value as "clockOut" | "lock" | "remove", item.id)}>
                          <Menu.Trigger asChild>
                            <IconButton variant="ghost" size="xs">
                              <Icon><LuEllipsisVertical /></Icon>
                            </IconButton>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content>
                                <Menu.Item value="clockOut" disabled={!!pendingAction}>
                                  <LuDoorOpen /> {t("actions.forceClockOut")} {clockOutPending ? <Spinner size="xs" ms={2} /> : null}
                                </Menu.Item>
                                <Menu.Item value="lock" disabled={!!pendingAction} color="fg.warning" _hover={{ bg: "bg.warning", color: "fg.warning" }}>
                                  <LuLock /> {t("actions.lockUser")} {lockPending ? <Spinner size="xs" ms={2} /> : null}
                                </Menu.Item>
                                <Menu.Item value="remove" disabled={!!pendingAction} color="fg.error" _hover={{ bg: "bg.error", color: "fg.error" }}>
                                  <LuTrash2 /> {t("actions.removeLog")} {removePending ? <Spinner size="xs" ms={2} /> : null}
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
                      </Table.Cell>
                    </>) : null}
                  </Table.Row>
                );
              })}
            </Table.Body>
          );
        }}
      </Pagination.Context>
    </Table.Root >
  );
}

export function CurrentlyClockedInContent(props: {
  children: React.ReactNode
} & ComponentPropsWithoutChildren<typeof Stack>) {
  const { children, ...stackProps } = props;

  const { logs } = useCurrentlyClockedInContext();

  return (
    <VStack hidden={logs.length === 0} {...stackProps}>
      {children}
    </VStack>
  );
}

export function CurrentlyClockedInNoData(props: {
  hasUser?: boolean;
} & ComponentPropsWithoutChildren<typeof EmptyState.Root>) {
  const { hasUser, ...emptyStateRootProps } = props;
  const t = useTranslations("HomePage.currentlyInTable.emptyStates.noCurrentlyInUsers");

  const { logs } = useCurrentlyClockedInContext();

  return (
    <EmptyState.Root hidden={logs.length !== 0} {...emptyStateRootProps}>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <LuBuilding />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{t("title")}</EmptyState.Title>
          <EmptyState.Description>
            {t("description")} <br />
            {hasUser ? t("description2") : null}
          </EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}

export function CurrentlyClockedInPaginationControls(props: {
  hideWhenZeroCount?: boolean;
} & ComponentPropsWithoutChildren<typeof ButtonGroup>) {
  const { hideWhenZeroCount, ...buttonGroupProps } = props;
  const { variant = "ghost" } = buttonGroupProps;

  const { count } = usePaginationContext();

  return (
    <ButtonGroup hidden={count === 0 && hideWhenZeroCount} size="xs" wrap="wrap" {...buttonGroupProps} variant={variant}>
      <Pagination.PrevTrigger asChild>
        <IconButton>
          <LuChevronLeft />
        </IconButton>
      </Pagination.PrevTrigger>

      <Pagination.Items
        render={(page) => (
          <IconButton variant={{ base: variant, _selected: "outline" }}>
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
  );
}

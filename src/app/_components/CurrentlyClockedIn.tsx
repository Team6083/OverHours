"use client";
import { createContext, useContext, useRef, useState } from "react";
import { useNow, useTranslations } from "next-intl";

import {
  Badge, ButtonGroup, ClientOnly, CloseButton, EmptyState, Icon, IconButton, Input, InputGroup, Pagination, Table,
  useFilter,
  VStack
} from "@chakra-ui/react";
import { LuArrowUp10, LuBuilding, LuChevronLeft, LuChevronRight, LuDoorOpen, LuLock, LuTrash2 } from "react-icons/lu";

import { ComponentPropsWithoutChildren, formatDuration } from "@/lib/util";
import { Tooltip } from "@/components/ui/tooltip";

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

  handleAction: (action: "clockout" | "lock" | "remove", id: string) => Promise<void>;
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

  const handleAction = async (action: "clockout" | "lock" | "remove", id: string) => {
    let f: ((userId: string) => Promise<void>) | undefined;
    if (action === "clockout") f = handleClockout;
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

  const intlNow = useNow({ updateInterval: 10000 });
  const now = Math.max(intlNow.getTime(), Date.now());

  const { filteredLogs, handleAction: ctxHandleAction } = useCurrentlyClockedInContext();

  const [actionPending, setActionPending] = useState(false);
  const handleAction = async (action: "clockout" | "lock" | "remove", id: string) => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await ctxHandleAction(action, id);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <Table.Root size="md" interactive {...tableRootProps}>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>{t("header.user")}</Table.ColumnHeader>
          <Table.ColumnHeader>{t("header.inTime")} <Icon><LuArrowUp10 /></Icon></Table.ColumnHeader>
          <Table.ColumnHeader>{t("header.duration")}</Table.ColumnHeader>
          <Table.ColumnHeader hidden={!showAdminActions}>{t("header.actions")}</Table.ColumnHeader>
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
                const duration = Math.floor((now - item.inTime.getTime()) / 1000);

                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.user}</Table.Cell>

                    <Table.Cell>
                      <ClientOnly>{item.inTime.toLocaleString()}</ClientOnly>
                    </Table.Cell>

                    <Table.Cell>
                      <ClientOnly>
                        {formatDuration(duration)}
                      </ClientOnly>
                    </Table.Cell>

                    {showAdminActions ? (
                      <Table.Cell>
                        <ButtonGroup variant="ghost" size="xs" gap={0}>
                          <Tooltip content={t("actions.forceClockOut")}>
                            <IconButton
                              colorPalette="blue"
                              loading={actionPending}
                              onClick={() => handleAction("clockout", item.id)}
                            >
                              <LuDoorOpen />
                            </IconButton>
                          </Tooltip>

                          <Tooltip content={t("actions.lockUser")}>
                            <IconButton
                              colorPalette="orange"
                              loading={actionPending}
                              onClick={() => handleAction("lock", item.id)}
                            >
                              <LuLock />
                            </IconButton>
                          </Tooltip>

                          <Tooltip content={t("actions.removeLog")}>
                            <IconButton
                              colorPalette="red"
                              loading={actionPending}
                              onClick={() => handleAction("remove", item.id)}
                            >
                              <LuTrash2 />
                            </IconButton>
                          </Tooltip>
                        </ButtonGroup>
                      </Table.Cell>
                    ) : null}
                  </Table.Row>
                );
              })}
            </Table.Body>
          );
        }}
      </Pagination.Context>
    </Table.Root>
  );
}

export function CurrentlyClockedInNoData(props: ComponentPropsWithoutChildren<typeof EmptyState.Root>) {
  const t = useTranslations("HomePage");

  return (
    <EmptyState.Root {...props}>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <LuBuilding />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{t("emptyStates.noCurrentlyInUsers.title")}</EmptyState.Title>
          <EmptyState.Description>
            {t("emptyStates.noCurrentlyInUsers.description")}
          </EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}

export function CurrentlyClockedInPaginationControls(props: ComponentPropsWithoutChildren<typeof ButtonGroup>) {
  const { variant = "ghost" } = props;

  return (
    <ButtonGroup size="xs" wrap="wrap" {...props} variant={variant}>
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

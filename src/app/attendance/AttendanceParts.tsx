"use client";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Avatar, AvatarGroup, Box, Button, CloseButton, Dialog, HStack, IconButton, Input, Portal, SimpleGrid, Spinner, Stack, Text,
} from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

import { addMonths, DayStatus, monthDates, weekDates } from "@/lib/attendance";
import { BoardUser } from "@/lib/data/attendance-dto";
import { getBoardDay, getPersonMonth } from "./actions";

export const shortDate = (date: string) => date.slice(5).replace("-", "/");

const AVATAR_PALETTES = ["blue", "teal", "purple", "orange", "pink", "cyan"];
const MAX_AVATARS = 7;

const paletteFor = (name: string) => AVATAR_PALETTES[
  [...name].reduce((hash, char) => (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0, 0) % AVATAR_PALETTES.length
];

export function UserAvatar(props: { user: BoardUser; size: "xs" | "sm" }) {
  const { user, size } = props;

  return (
    <Avatar.Root size={size} colorPalette={paletteFor(user.name)} title={user.name}>
      {user.image && <Avatar.Image src={user.image} alt="" />}
      <Avatar.Fallback name={user.name} />
    </Avatar.Root>
  );
}

export function NameGroup(props: { label: string; palette: string; users: BoardUser[]; onOpen: () => void }) {
  const { label, palette, users, onOpen } = props;
  const t = useTranslations("Attendance");

  const shown = users.slice(0, MAX_AVATARS);
  const hiddenCount = users.length - shown.length;

  return (
    <Stack gap={2}>
      <HStack gap={2}>
        <Box w={2} h={2} rounded="full" bg={`${palette}.solid`} />
        <Text fontSize="sm" fontWeight="medium">{label}</Text>
      </HStack>
      {users.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">{t("nobody")}</Text>
      ) : (
        <Button
          variant="plain"
          height="auto"
          minW={0}
          px={0}
          justifyContent="flex-start"
          aria-label={`${label} – ${t("showAll")}`}
          onClick={onOpen}
        >
          <AvatarGroup gap={0} spaceX={-2}>
            {shown.map(user => <UserAvatar key={user.id} user={user} size="xs" />)}
            {hiddenCount > 0 && (
              <Avatar.Root size="xs" variant="solid" colorPalette="gray">
                <Avatar.Fallback>+{hiddenCount}</Avatar.Fallback>
              </Avatar.Root>
            )}
          </AvatarGroup>
        </Button>
      )}
    </Stack>
  );
}

/**
 * Loads `key` once and caches it. A failure is not cached: it shows until `retry` is called,
 * and the load is attempted again when the key changes.
 */
export function useKeyedLoad<T>(key: string, load: (key: string) => Promise<T | null>, seed: Record<string, T> = {}) {
  const [cache, setCache] = useState<Record<string, T>>(seed);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const data = cache[key];

  useEffect(() => {
    if (data !== undefined) return;
    let cancelled = false;

    load(key)
      .catch(() => null)
      .then(result => {
        if (cancelled) return;
        if (result === null) setFailedKey(key);
        else setCache(prev => ({ ...prev, [key]: result }));
      });

    return () => { cancelled = true; };
    // `load` is a stable closure over the caller's fixed arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, data]);

  const retry = () => { setFailedKey(null); setAttempt(count => count + 1); };

  return { data, failed: data === undefined && failedKey === key, retry };
}

const matchesQuery = (user: BoardUser, needle: string) =>
  [user.name, user.id].some(field => field.toLowerCase().includes(needle));

export type UserGroup = { key: "available" | "unavailable"; palette: string; users: BoardUser[] };

function PersonCalendar(props: {
  user: BoardUser;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const { user, month, today, onMonthChange, onSelectDate } = props;
  const t = useTranslations("Attendance");
  const format = useFormatter();

  const { data: days, failed, retry } = useKeyedLoad(
    month,
    async key => {
      const result = await getPersonMonth(user.id, key);
      return result.ok ? result.days : null;
    },
  );

  const dates = monthDates(month);
  const offset = (new Date(`${dates[0]}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weekdays = weekDates("2024-01-01").map(date =>
    format.dateTime(new Date(`${date}T00:00:00Z`), { timeZone: "UTC", weekday: "narrow" }));
  const monthLabel = format.dateTime(new Date(`${month}-01T00:00:00Z`), { timeZone: "UTC", year: "numeric", month: "long" });

  const cellStyle = (status: DayStatus | undefined) => status === "AVAILABLE"
    ? { bg: "green.subtle", color: "green.fg" }
    : status === "UNAVAILABLE"
      ? { bg: "red.subtle", color: "red.fg" }
      : { bg: "transparent", color: "fg.muted" };

  return (
    <Stack gap={4}>
      <HStack gap={3} minW={0}>
        <UserAvatar user={user} size="sm" />
        <Stack gap={0} minW={0}>
          <Text fontWeight="medium" truncate>{user.name}</Text>
        </Stack>
      </HStack>

      <HStack justify="space-between">
        <IconButton size="xs" variant="ghost" aria-label={t("calendar.previousMonth")} onClick={() => onMonthChange(addMonths(month, -1))}>
          <LuChevronLeft />
        </IconButton>
        <Text fontWeight="medium">{monthLabel}</Text>
        <IconButton size="xs" variant="ghost" aria-label={t("calendar.nextMonth")} onClick={() => onMonthChange(addMonths(month, 1))}>
          <LuChevronRight />
        </IconButton>
      </HStack>

      <SimpleGrid columns={7} gap={1} opacity={days === undefined ? 0.5 : 1}>
        {weekdays.map((weekday, index) => (
          <Text key={index} fontSize="xs" color="fg.muted" textAlign="center">{weekday}</Text>
        ))}
        {Array.from({ length: offset }, (_, index) => <Box key={`blank-${index}`} />)}
        {dates.map(date => {
          const status = days?.[date];
          const style = cellStyle(status);

          return (
            <Button
              key={date}
              variant="plain"
              h={9}
              minW={0}
              px={0}
              rounded="md"
              fontSize="sm"
              fontWeight={status ? "semibold" : "normal"}
              borderWidth={date === today ? "2px" : "1px"}
              borderColor={date === today ? "blue.solid" : "border.muted"}
              title={`${date} ${t(`status.${status ?? "NOT_FILLED"}`)}`}
              aria-label={`${date} ${t(`status.${status ?? "NOT_FILLED"}`)}`}
              onClick={() => onSelectDate(date)}
              _hover={{ borderColor: "blue.solid" }}
              {...style}
            >
              {Number(date.slice(8))}
            </Button>
          );
        })}
      </SimpleGrid>

      {failed && (
        <HStack gap={2}>
          <Text fontSize="sm" color="red.fg">{t("calendar.loadFailed")}</Text>
          <Button size="xs" variant="outline" onClick={retry}>{t("retry")}</Button>
        </HStack>
      )}

      <HStack gap={4} fontSize="xs" color="fg.muted" wrap="wrap">
        {(["AVAILABLE", "UNAVAILABLE", "NOT_FILLED"] as const).map(status => (
          <HStack key={status} gap={1}>
            <Box
              w={3}
              h={3}
              rounded="sm"
              borderWidth="1px"
              borderColor="border.muted"
              bg={status === "AVAILABLE" ? "green.subtle" : status === "UNAVAILABLE" ? "red.subtle" : "transparent"}
            />
            {t(`status.${status}`)}
          </HStack>
        ))}
      </HStack>
    </Stack>
  );
}

function UserListView(props: { groups: UserGroup[]; onSelectUser: (user: BoardUser) => void }) {
  const { groups, onSelectUser } = props;
  const t = useTranslations("Attendance");
  const [query, setQuery] = useState("");
  // Skip autofocus on touch devices, where it would raise the keyboard over the dialog.
  const [autoFocus] = useState(() => typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches);

  const needle = query.trim().toLowerCase();
  const visible = groups
    .map(group => ({ ...group, users: needle ? group.users.filter(user => matchesQuery(user, needle)) : group.users }))
    .filter(group => group.users.length > 0);

  return (
    <Stack gap={4}>
      <Input
        size="sm"
        type="search"
        autoFocus={autoFocus}
        value={query}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        onChange={event => setQuery(event.target.value)}
      />
      {visible.length === 0 && <Text fontSize="sm" color="fg.muted">{t("noMatch")}</Text>}
      {visible.map(group => (
        <Stack key={group.key} gap={2}>
          <HStack gap={2}>
            <Box w={2} h={2} rounded="full" bg={`${group.palette}.solid`} />
            <Text fontSize="sm" fontWeight="medium">{t(`board.${group.key}`, { count: group.users.length })}</Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gapX={2} gapY={1}>
            {group.users.map(user => (
              <Button
                key={user.id}
                variant="ghost"
                size="sm"
                height="auto"
                minW={0}
                px={1}
                py={1}
                justifyContent="flex-start"
                onClick={() => onSelectUser(user)}
              >
                <UserAvatar user={user} size="sm" />
                <Stack gap={0} minW={0} align="flex-start" fontWeight="normal">
                  <Text fontSize="sm" truncate maxW="full">{user.name}</Text>
                </Stack>
              </Button>
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}

/** Everyone's availability on one day, loaded when the dialog jumps to a date picked in a calendar. */
function DayView(props: { date: string; onSelectUser: (user: BoardUser) => void }) {
  const { date, onSelectUser } = props;
  const t = useTranslations("Attendance");
  const { data: day, failed, retry } = useKeyedLoad(
    date,
    async key => {
      const result = await getBoardDay(key);
      return result.ok ? result.day : null;
    },
  );

  if (failed) {
    return (
      <HStack gap={2}>
        <Text fontSize="sm" color="red.fg">{t("day.loadFailed")}</Text>
        <Button size="xs" variant="outline" onClick={retry}>{t("retry")}</Button>
      </HStack>
    );
  }
  if (day === undefined) return <Spinner size="sm" />;

  return (
    <UserListView
      groups={[
        { key: "available", palette: "green", users: day.available },
        { key: "unavailable", palette: "red", users: day.unavailable },
      ]}
      onSelectUser={onSelectUser}
    />
  );
}

type View =
  | { type: "list" }
  | { type: "person"; user: BoardUser; month: string }
  | { type: "day"; date: string };

function DialogContent(props: { title: string; groups: UserGroup[]; month: string; today: string }) {
  const { title, groups, month, today } = props;
  const t = useTranslations("Attendance");
  const format = useFormatter();
  const [stack, setStack] = useState<View[]>([{ type: "list" }]);
  const view = stack[stack.length - 1];

  const push = (next: View) => setStack(prev => [...prev, next]);
  const pop = () => setStack(prev => prev.slice(0, -1));
  const selectUser = (user: BoardUser) => push({ type: "person", user, month });
  // Picking someone from a day's list replaces the whole trail above the list, so it never goes deeper than list > calendar > day.
  const switchUser = (user: BoardUser, from: string) => setStack(prev => [prev[0], { type: "person", user, month: from }]);

  const dayTitle = (date: string) => {
    const weekday = format.dateTime(new Date(`${date}T00:00:00Z`), { timeZone: "UTC", weekday: "short" });
    return `${shortDate(date)} ${weekday}`;
  };

  return (
    <>
      <Dialog.Header>
        <HStack gap={1}>
          {stack.length > 1 && (
            <IconButton size="xs" variant="ghost" aria-label={t("back")} onClick={pop}>
              <LuChevronLeft />
            </IconButton>
          )}
          <Dialog.Title>{view.type === "day" ? dayTitle(view.date) : title}</Dialog.Title>
        </HStack>
      </Dialog.Header>
      <Dialog.Body pb={6}>
        {view.type === "list" && <UserListView groups={groups} onSelectUser={user => selectUser(user)} />}
        {view.type === "day" && <DayView date={view.date} onSelectUser={user => switchUser(user, view.date.slice(0, 7))} />}
        {view.type === "person" && (
          <PersonCalendar
            user={view.user}
            month={view.month}
            today={today}
            onMonthChange={next => setStack(prev => [...prev.slice(0, -1), { ...view, month: next }])}
            onSelectDate={date => push({ type: "day", date })}
          />
        )}
      </Dialog.Body>
    </>
  );
}

export function UserListDialog(props: {
  open: boolean;
  title: string;
  resetKey: string;
  groups: UserGroup[];
  month: string;
  today: string;
  onClose: () => void;
}) {
  const { open, title, resetKey, groups, month, today, onClose } = props;

  return (
    <Dialog.Root
      size="sm"
      placement="center"
      scrollBehavior="inside"
      lazyMount
      unmountOnExit
      open={open}
      onOpenChange={change => { if (!change.open) onClose(); }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          {/* Fixed height so the dialog does not resize when switching between list, calendar and loading. */}
          <Dialog.Content h="min(34rem, 85dvh)">
            <DialogContent key={resetKey} title={title} groups={groups} month={month} today={today} />
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

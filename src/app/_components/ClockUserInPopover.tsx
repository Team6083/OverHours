"use client";
import { ComponentProps, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Group, Combobox, Button, useFilter, useListCollection, usePopoverContext, Icon, IconButton, Popover, Portal, Text, Box } from "@chakra-ui/react";
import { LuUserPlus } from "react-icons/lu";

import { UserDTO } from "@/lib/data/user-dto";
import { handleAdminClockIn } from "../actions";

export default function ClockUserInPopover(props: {
  users: UserDTO[],
  buttonProps: ComponentProps<typeof Button>,
} & Omit<ComponentProps<typeof Popover.Root>, "children">) {
  const { users, buttonProps, ...popoverRootProps } = props;
  const t = useTranslations("HomePage");

  return (
    <Popover.Root {...popoverRootProps}>
      <Popover.Trigger asChild>
        <Box>
          <IconButton {...buttonProps} hideFrom="sm"><LuUserPlus /></IconButton>
          <Button {...buttonProps} hideBelow="sm">
            <Icon><LuUserPlus /></Icon> {t("clockUserInPopover.clockUserIn")}
          </Button>
        </Box>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="medium" mb={4}>{t("clockUserInPopover.clockUserIn")}</Popover.Title>
              <ClockUserInCombobox size="xs" w="full" users={users} />
              {users.length === 0 && <Text mt={2} fontSize="xs" color="fg.warning">
                {t("clockUserInPopover.noUsersToClockIn")}
              </Text>}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function ClockUserInCombobox(props: {
  users: UserDTO[],
} & Omit<ComponentProps<typeof Combobox.Root>, "children" | "collection" | "onInputValueChange" | "value" | "onValueChange">) {
  const { users, ...comboboxRootProps } = props;
  const t = useTranslations("HomePage");

  const { contains, startsWith } = useFilter({ sensitivity: "base" });

  const selectItems = useMemo(() => users.map((user) => ({
    label: user.name || user.id,
    value: user.id,
    user
  })), [users]);

  const { collection, filter, set } = useListCollection({
    initialItems: selectItems,
    filter: (itemText, filterText, item) => {
      if (contains(itemText, filterText)) return true;
      if (contains(item.user.name, filterText)) return true;
      if (startsWith(item.user.email, filterText)) return true;
      return false;
    },
  });

  useEffect(() => {
    set(selectItems);
  }, [set, selectItems]);

  const [value, setValue] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const popoverCtx = usePopoverContext();

  const handleClockIn = async () => {
    try {
      setLoading(true);
      await handleAdminClockIn(value[0]);
    } finally {
      setLoading(false);
      setValue([]);
      popoverCtx.setOpen(false);
    }
  }

  return (
    <Combobox.Root
      {...comboboxRootProps}
      collection={collection}
      onInputValueChange={(e) => filter(e.inputValue)}
      value={value}
      onValueChange={(e) => setValue(e.value)}
      disabled={users.length === 0}
    >
      <Group justifyContent="flex-end" attached>
        <Combobox.Control flex="1">
          <Combobox.Input flex="1" placeholder={t("clockUserInPopover.searchUserToClockIn")} />
          <Combobox.IndicatorGroup>
            <Combobox.ClearTrigger />
          </Combobox.IndicatorGroup>
        </Combobox.Control>
        <Button
          size="xs"
          colorPalette="blue"
          variant="outline"
          disabled={value.length === 0} loading={loading}
          onClick={handleClockIn}
        >{t("buttons.clockIn")}</Button>
      </Group>

      <Combobox.Positioner>
        <Combobox.Content>
          <Combobox.Empty>{t("clockUserInPopover.noUsersFound")}</Combobox.Empty>
          {collection.items.map((item) => (
            <Combobox.Item item={item} key={item.value}>
              {item.label}
              <Combobox.ItemIndicator />
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}

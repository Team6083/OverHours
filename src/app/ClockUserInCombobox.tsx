"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Group, Combobox, Portal, Button, useFilter, useListCollection } from "@chakra-ui/react";

import { UserDTO } from "@/lib/data/user-dto";
import { handleAdminClockIn } from "./actions";

export default function ClockUserInCombobox(props: {
  users: UserDTO[],
}) {
  const { users } = props;
  const t = useTranslations("HomePage");

  const { contains, startsWith } = useFilter({ sensitivity: "base" });

  const initialItems = useMemo(() => users.map((user) => ({ label: user.name || user.id, value: user.id, user })), [users]);

  const { collection, filter } = useListCollection({
    initialItems,
    filter: (itemText, filterText, item) => {
      if (contains(itemText, filterText)) return true;
      if (contains(item.user.name, filterText)) return true;
      if (startsWith(item.user.email, filterText)) return true;
      return false;
    },
  });

  const [value, setValue] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleClockIn = async () => {
    try {
      setLoading(true);
      await handleAdminClockIn(value[0]);
    } finally {
      setLoading(false);
      setValue([]);
    }
  }

  return (
    <Combobox.Root
      size="xs" maxW="xs" w="full"
      collection={collection}
      onInputValueChange={(e) => filter(e.inputValue)}
      value={value}
      onValueChange={(e) => setValue(e.value)}
    >
      <Group justifyContent="flex-end" attached>
        <Combobox.Control flex="1">
          <Combobox.Input flex="1" placeholder={t("clockUserInCombobox.searchUserToClockIn")} />
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
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.Empty>{t("clockUserInCombobox.noUsersFound")}</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value}>
                {item.label}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
}

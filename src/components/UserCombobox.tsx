"use client";

import { useEffect, useMemo } from "react";
import { Combobox, Portal, useFilter, useListCollection } from "@chakra-ui/react";

interface UserComboboxProps {
  users: { id: string; name: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  size?: "xs" | "sm" | "md";
  width?: string | object;
  minWidth?: string;
}

export default function UserCombobox({
  users,
  value,
  onValueChange,
  placeholder = "Select user",
  emptyText = "No users found",
  size = "xs",
  width,
  minWidth,
}: UserComboboxProps) {
  const { contains } = useFilter({ sensitivity: "base" });

  const items = useMemo(
    () => users.map((u) => ({ label: u.name, value: u.id })),
    [users]
  );

  const { collection, filter, set } = useListCollection({
    initialItems: items,
    filter: contains,
  });

  useEffect(() => {
    set(items);
  }, [set, items]);

  return (
    <Combobox.Root
      collection={collection}
      onInputValueChange={(e) => filter(e.inputValue)}
      value={value ? [value] : []}
      onValueChange={(e) => onValueChange(e.value[0] ?? "")}
      size={size}
      width={width}
      minWidth={minWidth}
    >
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.Empty>{emptyText}</Combobox.Empty>
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

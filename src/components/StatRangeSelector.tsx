"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createListCollection, Select, Portal } from "@chakra-ui/react";

import { StatRangeDTO } from "@/lib/data/statrange-dto";
import { getActiveStatRanges } from "./actions";

export default function StatRangeSelector(props: {
  onSelectAction?: (startDate: Date, endDate: Date) => void;
  onClearAction?: () => void;
}) {
  const { onSelectAction, onClearAction } = props;
  const t = useTranslations("StatRangeSelector");

  const [statRanges, setStatRanges] = useState<StatRangeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    getActiveStatRanges()
      .then((ranges: StatRangeDTO[]) => setStatRanges(ranges))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const collection = useMemo(() => createListCollection({
    items: [
      { label: t("all"), value: "" },
      ...statRanges.map(range => ({ label: range.name, value: range.id })),
    ],
  }), [statRanges, t]);

  const handleValueChange = ({ value }: { value: string[] }) => {
    const id = value[0] ?? "";
    setSelectedId(id);
    if (!id) {
      onClearAction?.();
      return;
    }
    const selectedRange = statRanges.find(range => range.id === id);
    if (selectedRange && onSelectAction) {
      onSelectAction(selectedRange.startDate, selectedRange.endDate);
    }
  };

  if (error || (!loading && statRanges.length === 0)) {
    return null;
  }

  return (
    <Select.Root
      collection={collection}
      size="xs"
      w="auto"
      minW="44"
      value={[selectedId]}
      onValueChange={handleValueChange}
      disabled={loading}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={loading ? t("loading") : t("all")} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map(item => (
              <Select.Item item={item} key={item.value}>
                {item.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

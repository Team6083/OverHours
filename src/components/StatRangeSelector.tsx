"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { NativeSelectRoot, NativeSelectField } from "@chakra-ui/react";

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

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
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
    <NativeSelectRoot size="xs" w="auto" minW="32" disabled={loading}>
      <NativeSelectField
        aria-label={t("label")}
        value={selectedId}
        onChange={handleChange}
      >
        <option value="">{loading ? t("loading") : t("all")}</option>
        {statRanges.map((range) => (
          <option key={range.id} value={range.id}>
            {range.name}
          </option>
        ))}
      </NativeSelectField>
    </NativeSelectRoot>
  );
}

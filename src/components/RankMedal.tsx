import { Box } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { TbMedal } from "react-icons/tb";

// Gold, silver and bronze for 1st, 2nd and 3rd.
const MEDAL_COLORS = ["#EF9F27", "#B4B2A9", "#D85A30"];

/** 16px medal at the bottom right of a `position: relative` avatar; renders nothing below 3rd. */
export default function RankMedal(props: { rank?: number }) {
  const { rank = 0 } = props;
  const t = useTranslations("RankMedal");
  const color = MEDAL_COLORS[rank - 1];
  if (!color) return null;

  const label = t("label", { rank });

  // Inline size so a surrounding Button's icon styles can't resize it.
  return (
    <Box position="absolute" right="-3px" bottom="-0.5" display="flex" color={color} role="img" aria-label={label} title={label}>
      <TbMedal aria-hidden style={{ width: 16, height: 16 }} />
    </Box>
  );
}

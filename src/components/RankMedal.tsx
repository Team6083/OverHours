import { Box } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { PiCrownFill, PiMedalFill } from "react-icons/pi";

// Gold, silver and bronze for 1st, 2nd and 3rd.
const MEDAL_COLORS = ["#EF9F27", "#B4B2A9", "#915136"];

/** Crown on top of a `position: relative` avatar for 1st, a medal at the bottom right for 2nd and 3rd. */
export default function RankMedal(props: { rank?: number }) {
  const { rank = 0 } = props;
  const t = useTranslations("RankMedal");
  const color = MEDAL_COLORS[rank - 1];
  if (!color) return null;

  const label = t("label", { rank });
  const first = rank === 1;
  const Icon = first ? PiCrownFill : PiMedalFill;

  // Inline size so a surrounding Button's icon styles can't resize it.
  return (
    <Box
      position="absolute"
      display="flex"
      color={color}
      filter={{ base: "drop-shadow(0 0 1px white)", _dark: "drop-shadow(0 0 1px black)" }}
      role="img"
      aria-label={label}
      title={label}
      {...(first
        ? { top: "-9px", left: "50%", transform: "translateX(-50%) rotate(-12deg)" }
        : { right: "-3px", bottom: "-0.5" })}
    >
      <Icon aria-hidden style={{ width: 16, height: 16 }} />
    </Box>
  );
}

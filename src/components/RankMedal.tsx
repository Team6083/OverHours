import { ComponentProps } from "react";
import { Avatar, Box } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { PiCrownFill, PiMedalFill } from "react-icons/pi";

// Gold, silver and bronze for 1st, 2nd and 3rd.
const MEDAL_COLORS = ["#EF9F27", "#B4B2A9", "#915136"];

type AvatarSize = ComponentProps<typeof Avatar.Root>["size"];

// Icon px per avatar size, about 40% of the avatar.
const ICON_PX: Record<string, number> = { "2xs": 11, xs: 13, sm: 14, md: 16, lg: 17, xl: 19, "2xl": 24, full: 24 };

/** Maps a (possibly responsive) avatar size to a responsive style value. */
function bySize(size: AvatarSize, f: (px: number) => string) {
  const one = (s: unknown) => f(ICON_PX[String(s ?? "md")] ?? 16);
  if (Array.isArray(size)) return size.map(one);
  if (size && typeof size === "object") return Object.fromEntries(Object.entries(size).map(([k, v]) => [k, one(v)]));
  return one(size);
}

/** Crown on top of a `position: relative` avatar for 1st, a medal at the bottom right for 2nd and 3rd, sized to the avatar. */
export default function RankMedal(props: { rank?: number; size?: AvatarSize }) {
  const { rank = 0, size } = props;
  const t = useTranslations("RankMedal");
  const color = MEDAL_COLORS[rank - 1];
  if (!color) return null;

  const label = t("label", { rank });
  const first = rank === 1;
  const Icon = first ? PiCrownFill : PiMedalFill;

  // The svg fills the box inline so a surrounding Button's icon styles can't resize it.
  return (
    <Box
      position="absolute"
      display="flex"
      boxSize={bySize(size, px => `${px}px`)}
      color={color}
      filter={{ base: "drop-shadow(0 0 1px white)", _dark: "drop-shadow(0 0 1px black)" }}
      role="img"
      aria-label={label}
      title={label}
      {...(first
        ? { top: bySize(size, px => `-${Math.round(px * 0.55)}px`), left: "50%", transform: "translateX(-50%) rotate(-12deg)" }
        : { right: bySize(size, px => `-${Math.round(px * 0.2)}px`), bottom: "-2px" })}
    >
      <Icon aria-hidden style={{ width: "100%", height: "100%" }} />
    </Box>
  );
}

import { ComponentProps } from "react";
import { Avatar, Box } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { PiCrownFill, PiMedalFill } from "react-icons/pi";

// Gold, silver and bronze for 1st, 2nd and 3rd; the dark bronze is too dim on a dark page, so dark mode gets a lighter one.
const MEDAL_COLORS = [
  { base: "#EF9F27" },
  { base: "#B4B2A9" },
  { base: "#915136", _dark: "#C2774A" },
];

type AvatarSize = ComponentProps<typeof Avatar.Root>["size"];
type AvatarSizeToken = Extract<NonNullable<AvatarSize>, string>;

// Chakra v3 avatar sizes in px; `full` has no fixed size, so it is treated like `md`.
const AVATAR_PX: Record<AvatarSizeToken, number> = { "2xs": 24, xs: 32, sm: 36, md: 40, lg: 44, xl: 48, "2xl": 64, full: 40 };

// 40% of the avatar, but never below 11px so it stays readable on the smallest avatars.
const iconPx = (size: AvatarSizeToken) => Math.max(11, Math.round(AVATAR_PX[size] * 0.4));

/** Maps a (possibly responsive) avatar size to a responsive style value. */
function bySize(size: AvatarSize, f: (px: number) => string) {
  const one = (s: AvatarSizeToken | null | undefined) => f(iconPx(s ?? "md"));
  if (Array.isArray(size)) return size.map(one);
  if (size && typeof size === "object") {
    return Object.fromEntries(Object.entries(size).map(([k, v]) => [k, one(v as AvatarSizeToken | null | undefined)]));
  }
  return one(size as AvatarSizeToken | null | undefined);
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

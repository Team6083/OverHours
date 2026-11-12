import { ComponentProps } from "react";
import { Avatar, Box } from "@chakra-ui/react";

import RankMedal from "./RankMedal";

const AVATAR_PALETTES = ["blue", "teal", "purple", "orange", "pink", "cyan"];

const paletteFor = (name: string) => AVATAR_PALETTES[
  [...name].reduce((hash, char) => (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0, 0) % AVATAR_PALETTES.length
];

/** Every user avatar in the app: one palette per name, initials as the fallback, and a medal for the top three. */
export default function UserAvatar(props: {
  name: string;
  image?: string | null;
  size: ComponentProps<typeof Avatar.Root>["size"];
  rank?: number;
}) {
  const { name, image, size, rank } = props;

  return (
    <Box position="relative" flexShrink={0}>
      <Avatar.Root size={size} colorPalette={paletteFor(name)} title={name}>
        {image && <Avatar.Image src={image} alt="" />}
        <Avatar.Fallback name={name} />
      </Avatar.Root>
      <RankMedal rank={rank} />
    </Box>
  );
}

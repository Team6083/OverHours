import { ComponentProps } from "react";
import { Avatar, Box } from "@chakra-ui/react";

import RankMedal, { RankHalo } from "./RankMedal";

const AVATAR_PALETTES = ["blue", "teal", "purple", "orange", "pink", "cyan"];

const paletteFor = (name: string) => AVATAR_PALETTES[
  [...name].reduce((hash, char) => (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0, 0) % AVATAR_PALETTES.length
];

/** Every user avatar in the app: one palette per name, initials as the fallback, a crown for 1st place and a medal for 2nd and 3rd, inside a ring of the same colour. */
export default function UserAvatar(props: {
  name: string;
  image?: string | null;
  size: ComponentProps<typeof Avatar.Root>["size"];
  rank?: number;
  /** Off where avatars overlap, since the ring would cover its neighbours. */
  halo?: boolean;
}) {
  const { name, image, size, rank, halo = true } = props;

  return (
    <Box position="relative" flexShrink={0}>
      <Avatar.Root size={size} colorPalette={paletteFor(name)} title={name}>
        {image && <Avatar.Image src={image} alt="" />}
        <Avatar.Fallback name={name} />
      </Avatar.Root>
      {halo && <RankHalo rank={rank} />}
      <RankMedal rank={rank} size={size} />
    </Box>
  );
}

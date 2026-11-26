import { ComponentProps } from "react";

import { Avatar, Box } from "@chakra-ui/react";
import { MemberAvatar } from "@team6083/ui";

import { RankHalo, RankMedal } from "./RankMedal";

/** Every user avatar in the app: the team's MemberAvatar (one palette per name, initials as the fallback) with a crown for 1st place and a medal for 2nd and 3rd, inside a ring of the same colour. */
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
      <MemberAvatar name={name} image={image} size={size} />
      {halo && <RankHalo rank={rank} />}
      <RankMedal rank={rank} size={size} />
    </Box>
  );
}

import { Badge, Text } from "@chakra-ui/react";
import { ComponentProps } from "react";

export default function RankingBadge(props: {
  ranking: number,
} & ComponentProps<typeof Badge>) {
  const { ranking, ...badgeProps } = props;

  let colorScheme: "pink" | "yellow" | "orange" | "gray" = "gray";
  let numberSuffix: string = "th";

  if (ranking === 1) {
    colorScheme = "pink";
    numberSuffix = "st";
  } else if (ranking === 2) {
    colorScheme = "yellow";
    numberSuffix = "nd";
  } else if (ranking === 3) {
    colorScheme = "orange";
    numberSuffix = "rd";
  }

  return (
    <Badge colorPalette={colorScheme} {...badgeProps}>
      <Text>{ranking}<sup>{numberSuffix}</sup></Text>
    </Badge>
  );
}

import { Badge, Text } from "@chakra-ui/react";
import { ComponentProps } from "react";

export default function RankingBadge(props: {
  ranking: number,
} & ComponentProps<typeof Badge>) {
  const { ranking, ...badgeProps } = props;

  let colorScheme: "pink" | "yellow" | "orange" | "gray" = "gray";
  let numberSuffix: string = "th";

  if (ranking % 10 === 1 && ranking !== 11) {
    numberSuffix = "st";
  } else if (ranking % 10 === 2 && ranking !== 12) {
    numberSuffix = "nd";
  } else if (ranking % 10 === 3 && ranking !== 13) {
    numberSuffix = "rd";
  }

  if (ranking === 1) {
    colorScheme = "pink";
  } else if (ranking === 2) {
    colorScheme = "yellow";
  } else if (ranking === 3) {
    colorScheme = "orange";
  }

  return (
    <Badge colorPalette={colorScheme} {...badgeProps}>
      <Text>{ranking}<sup>{numberSuffix}</sup></Text>
    </Badge>
  );
}

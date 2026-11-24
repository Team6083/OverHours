import { ComponentProps } from "react";
import { Clipboard as ChakraClipboard, Link } from "@chakra-ui/react";

export default function Clipboard(props: { value: string } & ComponentProps<typeof Link>) {
  return (
    <ChakraClipboard.Root value={props.value}>
      <ChakraClipboard.Trigger asChild>
        <Link as="span" textStyle="sm" {...props}>
          <ChakraClipboard.ValueText />
          <ChakraClipboard.Indicator />
        </Link>
      </ChakraClipboard.Trigger>
    </ChakraClipboard.Root>
  );
}

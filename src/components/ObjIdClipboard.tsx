import { ComponentProps } from "react";
import { Clipboard, Link } from "@chakra-ui/react";

export default function GenericClipboard(props: { value: string } & ComponentProps<typeof Link>) {
  return (
    <Clipboard.Root value={props.value}>
      <Clipboard.Trigger asChild>
        <Link as="span" textStyle="sm" {...props}>
          <Clipboard.ValueText />
          <Clipboard.Indicator />
        </Link>
      </Clipboard.Trigger>
    </Clipboard.Root>
  );
}

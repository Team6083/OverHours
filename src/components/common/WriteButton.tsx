"use client";
import { Button, ButtonProps } from "@chakra-ui/react";
import { useAppOutdated } from "@team6083/ui";

/** A button that changes data: locked while the server runs a newer build, until the page reloads. */
export default function WriteButton(props: ButtonProps) {
  const outdated = useAppOutdated();
  return <Button {...props} disabled={outdated || props.disabled} />;
}

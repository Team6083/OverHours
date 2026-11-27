"use client";
import { useRouter } from "next/navigation";
import { type ReactElement, type ReactNode, useState, useTransition } from "react";

import { Alert, Button, ButtonGroup, CloseButton, Dialog, Icon, Portal, Stack, Text } from "@chakra-ui/react";
import { useAppOutdated } from "@team6083/ui";
import { LuTrash2 } from "react-icons/lu";

export interface DeleteDialogControls {
  /** Opens the dialog when clicked. Leave it out and control the dialog with `open` / `onOpenChange` instead. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Where to go once deleted, e.g. back to the list from a detail page. */
  redirectTo?: string;
  onDeleted?: () => void;
}

/** Asks before deleting one or more records: a message, what is deleted, and Cancel / Delete. */
export default function DeleteDialog(props: DeleteDialogControls & {
  /** E.g. "Are you sure you want to delete this time log?" */
  message: ReactNode;
  /** What is deleted. */
  children?: ReactNode;
  onDelete: () => Promise<unknown>;
}) {
  const { trigger, redirectTo, onDeleted, message, children, onDelete } = props;

  const router = useRouter();
  const outdated = useAppOutdated();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = props.open ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setUncontrolledOpen(next);
    props.onOpenChange?.(next);
    if (!next) setError(undefined);
  };

  const confirm = () => startTransition(async () => {
    setError(undefined);
    try {
      await onDelete();
    } catch (e) {
      console.error("Failed to delete", e);
      setError("Could not delete. Reload the page and try again.");
      return;
    }
    setOpen(false);
    onDeleted?.();
    if (redirectTo) router.push(redirectTo);
  });

  return <Dialog.Root size="lg" open={open} onOpenChange={(e) => { if (!pending) setOpen(e.open); }}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}

    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Confirm Deletion</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={4}>
              <Text>{message}</Text>
              {children}
              {error && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content>
                </Alert.Root>
              )}
            </Stack>
          </Dialog.Body>
          <Dialog.Footer>
            <ButtonGroup size="sm">
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={pending}>Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" loading={pending} disabled={outdated} onClick={confirm}>
                <Icon><LuTrash2 /></Icon>
                Delete
              </Button>
            </ButtonGroup>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <CloseButton size="sm" disabled={pending} />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>;
}

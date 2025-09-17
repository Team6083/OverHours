"use client";
import { ComponentProps } from "react";
import { Avatar, Box, Menu, MenuSelectionDetails, Portal } from "@chakra-ui/react";
import { LuLogOut } from "react-icons/lu";
import { signOut } from "next-auth/react";

export default function AvatarMenu(props: {
  user: { name?: string, image?: string }
} & ComponentProps<typeof Avatar.Root>) {
  const { user, ...avatarRootProps } = props;

  const handleSelect = ({ value }: MenuSelectionDetails) => {
    if (value === "signout") {
      // Handle sign out logic here
      signOut();
    }
  }

  return <Menu.Root onSelect={handleSelect}>
    <Menu.Trigger asChild>
      <Box cursor="pointer">
        <Avatar.Root {...avatarRootProps} cursor="pointer">
          <Avatar.Fallback name={user.name} />
          <Avatar.Image src={user.image} />
        </Avatar.Root>
      </Box>
    </Menu.Trigger>
    <Portal>
      <Menu.Positioner>
        <Menu.Content>
          <Menu.Item value="signout">
            <LuLogOut />
            Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>;
}
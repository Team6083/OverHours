"use client";
import { ComponentProps } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn, useSession } from "next-auth/react";

import { Box, Flex, HStack, Button, Heading, Icon, Avatar, Menu, Portal, MenuSelectionDetails } from "@chakra-ui/react";
import { LuLogIn, LuLogOut, LuLogs, LuUsers } from "react-icons/lu";

import { Role, signOut } from "@/auth";
import { ColorModeButton } from "@/components/ui/color-mode";

export default function AppNav(props: {} & Omit<ComponentProps<typeof Box>, "children">) {
  const { ...boxProps } = props;
  const t = useTranslations("AppNav");

  const { data: session } = useSession();

  const handleUserAvatarMenuSelect = ({ value }: MenuSelectionDetails) => {
    if (value === "signout") {
      // Handle sign out logic here
      signOut();
    }
  }

  return (
    <Box as="nav" {...boxProps}>
      {/* Main Navigation */}
      <Flex align="center" justify="space-between">
        {/* Logo and Brand */}
        <HStack>
          <Heading as="h1" size="xl" display="flex" alignItems="center">
            <Link href="/">
              <Box as="span">OverHours</Box>
            </Link>
            <Box as="span" fontSize="md" ml={2} fontWeight="normal" hideBelow="sm">
              CMS Robotics
            </Box>
          </Heading>
        </HStack>

        {/* Desktop Nav Links */}
        <HStack>
          {session && (
            <Link href="/logs" passHref>
              <Button size="sm" variant="ghost">
                <LuLogs />
                {t("nav.logs")}
              </Button>
            </Link>
          )}

          {session && session.user.role === Role.ADMIN && (
            <Link href="/admin/users" passHref>
              <Button size="sm" variant="ghost">
                <LuUsers />
                {t("nav.users")}
              </Button>
            </Link>
          )}

          <ColorModeButton />

          {session?.user
            ? <Menu.Root onSelect={handleUserAvatarMenuSelect}>
              <Menu.Trigger asChild>
                <Box cursor="pointer">
                  <Avatar.Root size="sm" cursor="pointer">
                    <Avatar.Fallback name={session.user.name || undefined} />
                    <Avatar.Image src={session.user.image || undefined} />
                  </Avatar.Root>
                </Box>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="signout">
                      <LuLogOut />
                      {t("nav.signOut")}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
            : <Button size="sm" onClick={() => signIn("keycloak")}>
              {t("nav.signIn")}
              <Icon><LuLogIn /></Icon>
            </Button>
          }
        </HStack>
      </Flex>
    </Box>
  );
}


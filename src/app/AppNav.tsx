"use client";
import { ComponentProps } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

import { Box, Flex, HStack, Button, Heading, Icon } from "@chakra-ui/react";
import { LuLogIn, LuLogs, LuUsers } from "react-icons/lu";

import { ColorModeButton } from "@/components/ui/color-mode";
import AvatarMenu from "./UserAvatarMenu";

export default function AppNav(props: {} & Omit<ComponentProps<typeof Box>, "children">) {
  const { ...boxProps } = props;

  const { data: session } = useSession();

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
          <Link href="/logs" passHref>
            <Button size="sm" variant="ghost">
              <LuLogs />
              Logs
            </Button>
          </Link>

          <Link href="/admin/users" passHref>
            <Button size="sm" variant="ghost">
              <LuUsers />
              Users
            </Button>
          </Link>

          <ColorModeButton />

          {session?.user
            ? <AvatarMenu
              user={{ name: session.user.name || undefined, image: session.user.image || undefined }}
              size="sm"
            />
            : <Button size="sm" onClick={() => signIn("keycloak")}>
              Sign-In
              <Icon><LuLogIn /></Icon>
            </Button>
          }
        </HStack>
      </Flex>
    </Box>
  );
}


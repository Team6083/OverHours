import { ComponentProps } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Box, Flex, HStack, Button, Heading, Icon, Avatar, Menu, Portal, MenuSelectionDetails, CloseButton, Drawer, IconButton, Stack, Separator } from "@chakra-ui/react";
import { LuChartNoAxesCombined, LuLogIn, LuLogOut, LuLogs, LuMenu, LuUsers } from "react-icons/lu";

import { auth, Role, signIn, signOut } from "@/auth";
import { ColorModeButton } from "@/components/ui/color-mode";

export default async function AppNav(props: {} & Omit<ComponentProps<typeof Box>, "children">) {
  const { ...boxProps } = props;
  const t = await getTranslations("AppNav");

  const session = await auth();

  const handleUserAvatarMenuSelect = async ({ value }: MenuSelectionDetails) => {
    "use server";
    if (value === "signout") {
      await signOut();
    }
  }

  const links = [
    { href: "/logs", label: t("nav.logs"), icon: LuLogs, roles: [Role.USER, Role.ADMIN] },
    { href: "/report", label: t("nav.reports"), icon: LuChartNoAxesCombined, roles: [Role.ADMIN] },
    { href: "/admin/users", label: t("nav.users"), icon: LuUsers, roles: [Role.ADMIN] },
  ]

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

        <HStack>

          {/* Desktop Nav Links */}
          <HStack hideBelow="sm">
            {links.map((link) => {
              if (link.roles.length > 0 && session?.user.role && !link.roles.includes(session.user.role)) {
                return null;
              }

              return (
                <Link key={link.href} href={link.href} passHref>
                  <Button size="sm" variant="ghost">
                    <link.icon />
                    {link.label}
                  </Button>
                </Link>
              );
            })}

            <ColorModeButton />
          </HStack>

          {session?.user
            ? <Menu.Root onSelect={handleUserAvatarMenuSelect}>
              <Menu.Trigger asChild>
                <Box cursor="pointer" mx={2}>
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
            : <Button size="sm" onClick={async () => {
              "use server";
              await signIn("keycloak");
            }}>
              {t("nav.signIn")}
              <Icon><LuLogIn /></Icon>
            </Button>
          }

          {/* Mobile Nav Drawer */}
          <Drawer.Root size="xs" placement="start">
            <Drawer.Trigger asChild>
              <IconButton hideFrom="sm" size="sm" variant="outline"><LuMenu /></IconButton>
            </Drawer.Trigger>
            <Portal>
              <Drawer.Backdrop />
              <Drawer.Positioner>
                <Drawer.Content maxW="3xs">
                  <Drawer.Header>
                    <Drawer.Title>Menu</Drawer.Title>
                  </Drawer.Header>
                  <Separator mx={2} />
                  <Drawer.Body>
                    <Stack gap={2}>
                      {links.map((link) => {
                        if (link.roles.length > 0 && session?.user.role && !link.roles.includes(session.user.role)) {
                          return null;
                        }

                        return (
                          <Link key={link.href} href={link.href} passHref>
                            <Button size="sm" variant="ghost">
                              <link.icon />
                              {link.label}
                            </Button>
                          </Link>
                        );
                      })}
                    </Stack>
                  </Drawer.Body>
                  <Drawer.CloseTrigger asChild>
                    <CloseButton size="sm" />
                  </Drawer.CloseTrigger>
                </Drawer.Content>
              </Drawer.Positioner>
            </Portal>
          </Drawer.Root>

        </HStack>
      </Flex>
    </Box>
  );
}


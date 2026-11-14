import { ComponentProps, Suspense } from "react";

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { SessionProvider } from "next-auth/react";

import { Box, Button, CloseButton, Container, Drawer, Flex, Heading, HStack, Icon, IconButton, Menu, MenuSelectionDetails, Portal, Separator, Stack, Text } from "@chakra-ui/react";
import { LuLogOut, LuLogIn, LuMenu, LuChartNoAxesCombined, LuLogs, LuUsers, LuCalendarRange, LuCalendarCheck, LuNetwork } from "react-icons/lu";

import { auth, Role, signIn, signOutAndEndKeycloakSession } from "@/auth";
import { ColorModeButton } from "@/components/ui/color-mode";
import { Provider } from "@/components/ui/provider"
import { Toaster } from "@/components/ui/toaster";
import AppVersionBadge from "@/components/AppVersionBadge";
import { TopRanksProvider } from "@/components/TopRanks";
import UserAvatar from "@/components/UserAvatar";
import { getOrgName } from "@/lib/config";
import { getTopUserIds } from "@/lib/data/timelog-dto";
import DrawerNavLink from "./_components/DrawerNavLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ORG_NAME is read at request time, so never prerender at build time.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const orgName = getOrgName();
  return {
    title: "OverHours",
    description: orgName ? `Time and Attendance System for ${orgName}` : "Time and Attendance System",
    // Opens full screen when added to the iOS home screen.
    appleWebApp: { capable: true, title: "OverHours", statusBarStyle: "black" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgName = getOrgName();
  // Set by src/proxy.ts; next-themes' inline script needs it to run under the CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const topUserIds = await topUserIdsForSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider>
          <Provider nonce={nonce}> {/* Chakra-UI provider */}
            <SessionProvider> {/* Auth.js provider, for useSession() hook */}
              <TopRanksProvider userIds={topUserIds}>
                <Container maxWidth="5xl" fluid p={4} my={2}>
                  <NavBar mb={4} orgName={orgName} topUserIds={topUserIds} />
                  {children}
                </Container>
              </TopRanksProvider>
              <footer>
                <Container maxWidth="5xl" fluid mb={8} textAlign={{ smDown: "center" }}>
                  <Stack flexDir={{ base: "column", sm: "row" }} justifyContent="space-between">
                    <Text as="span" fontSize="xs" color="fg.muted" textAlign={{ sm: "left" }}>
                      {orgName && <>© {new Date().getFullYear()} {orgName}<br /></>}
                      Made with ❤️ and way too many commits{" "}
                      <Text as="span" whiteSpace="nowrap">(fueled by ☕️)</Text>
                    </Text>
                    <FooterTechInfo hideBelow="sm" textAlign={{ sm: "right" }} />
                  </Stack>
                </Container>
              </footer>
              <Toaster />
            </SessionProvider>
          </Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/** Medals only show to signed-in users, so the ranking query is skipped for everyone else. */
async function topUserIdsForSession(): Promise<string[]> {
  if (!(await auth())) return [];
  return getTopUserIds().catch(() => []);
}

async function NavBar(props: {
  orgName: string;
  topUserIds: string[];
} & Omit<ComponentProps<typeof Box>, "children">) {
  const { orgName, topUserIds, ...boxProps } = props;
  const t = await getTranslations("AppNav");

  const session = await auth();

  const handleUserAvatarMenuSelect = async ({ value }: MenuSelectionDetails) => {
    "use server";
    if (value === "signout") {
      await signOutAndEndKeycloakSession();
    }
  }

  const links = [
    { href: "/logs", label: t("nav.logs"), icon: LuLogs, roles: [Role.USER, Role.ADMIN] },
    { href: "/attendance", label: t("nav.attendance"), icon: LuCalendarCheck, roles: [Role.USER, Role.ADMIN] },
    { href: "/report", label: t("nav.reports"), icon: LuChartNoAxesCombined, roles: [Role.ADMIN] },
    { href: "/admin/users", label: t("nav.users"), icon: LuUsers, roles: [Role.ADMIN] },
    { href: "/admin/teams", label: t("nav.teams"), icon: LuNetwork, roles: [Role.ADMIN] },
    { href: "/admin/stat-ranges", label: t("nav.statRanges"), icon: LuCalendarRange, roles: [Role.ADMIN] },
  ];

  return (
    <Box as="nav" {...boxProps}>
      {/* Main Navigation */}
      <Flex align="center" justify="space-between">
        {/* Logo and Brand */}
        <Stack gap={0}>
          <Heading as="h1" size="xl" display="flex" alignItems="center">
            <Link href="/">OverHours</Link>
            {orgName && <Box as="span" fontSize="md" ml={2} fontWeight="normal" hideBelow="md">{orgName}</Box>}
          </Heading>
          {orgName && <Box as="span" fontSize="xs" fontWeight="normal" hideFrom="md">{orgName}</Box>}
        </Stack>

        <Suspense>
          <HStack>

            {/* Desktop Nav Links */}
            <HStack hideBelow="md">
              {links.map((link) => {
                if (link.roles.length > 0 && (!session?.user.role || !link.roles.includes(session.user.role))) {
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
                    <UserAvatar
                      name={session.user.name ?? ""}
                      image={session.user.image}
                      size="sm"
                      rank={topUserIds.indexOf(session.user.id ?? "") + 1}
                    />
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
                <IconButton hideFrom="md" size="sm" variant="outline"><LuMenu /></IconButton>
              </Drawer.Trigger>
              <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                  <Drawer.Content maxW="3xs">
                    <Drawer.Header>
                      <Drawer.Title>{t("menu")}</Drawer.Title>
                    </Drawer.Header>
                    <Drawer.Body>
                      <Separator mb={4} />
                      <Stack gap={2}>
                        {links.map((link) => {
                          if (link.roles.length > 0 && (!session?.user.role || !link.roles.includes(session.user.role))) {
                            return null;
                          }

                          return <DrawerNavLink
                            key={link.href}
                            href={link.href}
                            label={link.label}
                            icon={<link.icon />}
                          />;
                        })}
                      </Stack>
                    </Drawer.Body>
                    <Drawer.Footer>
                      <FooterTechInfo />
                    </Drawer.Footer>
                    <Drawer.CloseTrigger asChild>
                      <CloseButton size="sm" />
                    </Drawer.CloseTrigger>
                  </Drawer.Content>
                </Drawer.Positioner>
              </Portal>
            </Drawer.Root>

          </HStack>
        </Suspense>
      </Flex>
    </Box>
  );
}

function FooterTechInfo(props: ComponentProps<typeof Text>) {
  return (
    <Text as="span" fontSize="xs" color="fg.muted" {...props}>
      <AppVersionBadge />
      <br />
      Powered by <Link href="https://nextjs.org/">Next.js</Link>
      {" and "}
      <Link href="https://chakra-ui.com/">Chakra UI</Link>
    </Text>
  );
}

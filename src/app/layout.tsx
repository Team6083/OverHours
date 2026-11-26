import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Text } from "@chakra-ui/react";
import type { NavItem } from "@team6083/ui";
import { LuCalendarCheck, LuCalendarRange, LuChartNoAxesCombined, LuLogs, LuNetwork, LuShieldCheck, LuUsers } from "react-icons/lu";

import { auth, Role, signIn, signOutAndEndKeycloakSession } from "@/auth";
import { TopRanksProvider } from "@/components/ranking/TopRanks";
import { getOrgName } from "@/lib/config";
import { getTopUserIds } from "@/lib/data/timelog-dto";
import AppFrame from "./_components/AppFrame";
import { Providers } from "./providers";

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
  const locale = await getLocale();
  const t = await getTranslations("AppNav");
  const session = await auth();
  const topUserIds = await topUserIdsForSession();

  const role = session?.user.role;
  const isAdmin = role === Role.ADMIN;
  const nav: NavItem[] = !role ? [] : [
    { href: "/logs", label: t("nav.logs"), icon: <LuLogs /> },
    { href: "/attendance", label: t("nav.attendance"), icon: <LuCalendarCheck /> },
    ...(isAdmin ? [
      { href: "/report", label: t("nav.reports"), icon: <LuChartNoAxesCombined /> },
      {
        label: t("nav.admin"),
        icon: <LuShieldCheck />,
        items: [
          { href: "/admin/users", label: t("nav.users"), icon: <LuUsers /> },
          { href: "/admin/teams", label: t("nav.teams"), icon: <LuNetwork /> },
          { href: "/admin/stat-ranges", label: t("nav.statRanges"), icon: <LuCalendarRange /> },
        ],
      },
    ] : []),
  ];

  const handleSignIn = async () => {
    "use server";
    await signIn("keycloak");
  };

  const handleSignOut = async () => {
    "use server";
    await signOutAndEndKeycloakSession();
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider>
          <Providers locale={locale} nonce={nonce}>
            <SessionProvider> {/* Auth.js provider, for useSession() hook */}
              <TopRanksProvider userIds={topUserIds}>
                <AppFrame
                  orgName={orgName}
                  nav={nav}
                  user={session?.user}
                  signInAction={handleSignIn}
                  signOutAction={handleSignOut}
                  footer={
                    <Text as="span">
                      {orgName && <>© {new Date().getFullYear()} {orgName}<br /></>}
                      Made with ❤️ and way too many commits{" "}
                      <Text as="span" whiteSpace="nowrap">(fueled by ☕️)</Text>
                    </Text>
                  }
                >
                  {children}
                </AppFrame>
              </TopRanksProvider>
            </SessionProvider>
          </Providers>
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

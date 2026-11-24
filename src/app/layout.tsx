import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { SessionProvider } from "next-auth/react";

import { Text } from "@chakra-ui/react";
import { LuChartNoAxesCombined, LuLogs, LuUsers, LuCalendarRange, LuCalendarCheck, LuNetwork } from "react-icons/lu";

import { auth, Role, signIn, signOutAndEndKeycloakSession } from "@/auth";
import { TopRanksProvider } from "@/components/TopRanks";
import { getOrgName } from "@/lib/config";
import { getTopUserIds } from "@/lib/data/timelog-dto";
import Frame from "./_components/Frame";
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
  const nav = [
    { href: "/logs", label: t("nav.logs"), icon: <LuLogs />, adminOnly: false },
    { href: "/attendance", label: t("nav.attendance"), icon: <LuCalendarCheck />, adminOnly: false },
    { href: "/report", label: t("nav.reports"), icon: <LuChartNoAxesCombined />, adminOnly: true },
    { href: "/admin/users", label: t("nav.users"), icon: <LuUsers />, adminOnly: true },
    { href: "/admin/teams", label: t("nav.teams"), icon: <LuNetwork />, adminOnly: true },
    { href: "/admin/stat-ranges", label: t("nav.statRanges"), icon: <LuCalendarRange />, adminOnly: true },
  ]
    .filter((link) => role && (link.adminOnly ? role === Role.ADMIN : true))
    .map(({ href, label, icon }) => ({ href, label, icon }));

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
                <Frame
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
                </Frame>
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

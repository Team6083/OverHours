"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useLocale } from "next-intl";

import { AccountMenu, AppShell, BuildInfo, LanguageMenu, SignInButton, SignOutMenuItem, type NavItem } from "@team6083/ui";
import { Menu } from "@chakra-ui/react";

import { LANGUAGES, LOCALE_COOKIE } from "@/i18n/locales";
import { Session } from "next-auth";

/** AppShell needs a function for links and the current path, so the server layout hands its data to this client frame. */
export default function Frame(props: {
  orgName?: string;
  nav: Omit<NavItem, "active">[];
  user?: Session["user"];
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { orgName, nav, user, signInAction, signOutAction, footer, children } = props;
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  // The server picks the locale from this cookie, so re-render the page with it set.
  const setLocale = (value: string) => {
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <AppShell
      appName="OverHours"
      orgName={orgName || undefined}
      nav={nav.map((item) => ({ ...item, active: pathname === item.href || pathname.startsWith(`${item.href}/`) }))}
      renderLink={(href, linkChildren) => <NextLink href={href}>{linkChildren}</NextLink>}
      account={user
        ? <AccountMenu name={user.name ?? user.id ?? "Unknown User"} detail={user.email} image={user.image}>
          <LanguageMenu languages={LANGUAGES} value={locale} onChange={setLocale} />
          <Menu.Separator />
          <SignOutMenuItem onSelect={() => void signOutAction()} />
        </AccountMenu>
        : <SignInButton onClick={signInAction} />}
      buildInfo={<>
        <BuildInfo
          version={process.env.NEXT_PUBLIC_VERSION}
          commit={process.env.NEXT_PUBLIC_COMMIT_SHA}
          builtAt={process.env.NEXT_PUBLIC_BUILD_DATE}
        />
        <br />
        Powered by <NextLink href="https://nextjs.org/">Next.js</NextLink>
        {" and "}
        <NextLink href="https://chakra-ui.com/">Chakra UI</NextLink>
      </>}
      footer={footer}
    >
      {children}
    </AppShell>
  );
}

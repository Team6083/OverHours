"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Session } from "next-auth";
import { useLocale, useTranslations } from "next-intl";

import { Badge, Menu } from "@chakra-ui/react";
import { AccountMenu, AppShell, BuildInfo, LanguageMenu, type NavItem, SignInButton, SignOutMenuItem } from "@team6083/ui";

import { useNewTables, useSetNewTables } from "@/components/common/TablePreference";
import { LANGUAGES, LOCALE_COOKIE } from "@/i18n/locales";

/** AppShell needs a function for links and the current path, so the server layout hands its data to this client frame. */
export default function AppFrame(props: {
  orgName?: string;
  /** Without `active`; the frame marks the current page. */
  nav: NavItem[];
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
  const t = useTranslations("AppNav");
  const newTables = useNewTables();
  const setNewTables = useSetNewTables();

  // The server picks the locale from this cookie, so re-render the page with it set.
  const setLocale = (value: string) => {
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navWithActive = nav.map((item): NavItem => item.items
    ? { ...item, items: item.items.map((link) => ({ ...link, active: isActive(link.href) })) }
    : { ...item, active: isActive(item.href) });

  return (
    <AppShell
      appName="OverHours"
      orgName={orgName || undefined}
      nav={navWithActive}
      renderLink={(href, linkChildren) => <NextLink href={href}>{linkChildren}</NextLink>}
      account={user
        ? <AccountMenu name={user.name ?? user.id ?? "Unknown User"} detail={user.email} image={user.image}>
          <LanguageMenu languages={LANGUAGES} value={locale} onChange={setLocale} />
          <Menu.CheckboxItem value="new-tables" checked={newTables} onCheckedChange={setNewTables}>
            {t("newTables")}
            <Badge size="xs" colorPalette="brand">Beta</Badge>
            <Menu.ItemIndicator />
          </Menu.CheckboxItem>
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

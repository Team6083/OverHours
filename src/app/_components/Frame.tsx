"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { AccountMenu, AppShell, BuildInfo, SignInButton, SignOutMenuItem, type NavItem } from "@team6083/ui";
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

  return (
    <AppShell
      appName="OverHours"
      orgName={orgName || undefined}
      nav={nav.map((item) => ({ ...item, active: pathname === item.href || pathname.startsWith(`${item.href}/`) }))}
      renderLink={(href, linkChildren) => <NextLink href={href}>{linkChildren}</NextLink>}
      account={user
        ? <AccountMenu name={user.name ?? user.id ?? "Unknown User"} detail={user.email} image={user.image}>
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

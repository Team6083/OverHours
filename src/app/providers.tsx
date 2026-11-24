"use client";

import { AppCommitProvider, Toaster, UiProvider } from "@team6083/ui";

export function Providers({ locale, nonce, children }: { locale: string; nonce?: string; children: React.ReactNode }) {
  return (
    <UiProvider locale={locale} nonce={nonce}>
      {/* Server actions don't expose response headers, so poll an endpoint that sends X-App-Commit. AppShell shows the banner. */}
      <AppCommitProvider buildCommit={process.env.NEXT_PUBLIC_COMMIT_SHA} pollUrl="/api/healthz">
        {children}
        <Toaster />
      </AppCommitProvider>
    </UiProvider>
  );
}

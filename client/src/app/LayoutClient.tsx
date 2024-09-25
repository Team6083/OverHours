'use client';

import { NotistackProvider } from './SnackbarProviderClient';

export default function LayoutClient({
  children,
}: Readonly<{
    children: React.ReactNode;
}>) {
  return (
    <NotistackProvider>
      {children}
    </NotistackProvider>
  );
}

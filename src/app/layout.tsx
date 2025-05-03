import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';

import { Inter } from 'next/font/google';
import './globals.css';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';

import appTheme from '@/theme';
import { authUser } from '@/auth';
import AppNav from './AppNav';
import { NotistackProvider } from './SnackbarProviderClient';

const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'OverHours - CMS Robotics',
  description: 'Clock-in System for CMS Robotics',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await authUser();

  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={appTheme}>
            <CssBaseline enableColorScheme />
            <SessionProvider>
              <AppNav user={user} />
              <NotistackProvider>
                <Box marginY={3}>
                  {children}
                </Box>
              </NotistackProvider>
            </SessionProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

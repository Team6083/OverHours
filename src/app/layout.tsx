import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { Box, Container } from "@chakra-ui/react";

import { Provider } from "@/components/ui/provider"
import AppNav from "./AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OverHours",
  description: "Time and Attendance System for CMS Robotics Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider>
          <Provider> {/* Chakra-UI provider */}
            <SessionProvider> {/* Auth.js provider, for useSession() hook */}
              <Container maxWidth="5xl" fluid p={4} my={2}>
                <Box mb={4}>
                  <AppNav />
                </Box>
                {children}
              </Container>
            </SessionProvider>
          </Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

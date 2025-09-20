import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { Badge, Box, ClientOnly, Container, Link, Stack, Text } from "@chakra-ui/react";

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
              <footer>
                <Container maxWidth="5xl" fluid mb={8} textAlign={{ base: "center", md: undefined }}>
                  <Stack flexDir={{ base: "column", md: "row" }} justifyContent="space-between">
                    <Text as="span" fontSize="xs" color="fg.muted" textAlign={{ base: undefined, md: "left" }}>
                      © 2025 CMS Robotics 協同機器人團隊
                      <br />
                      Made with ❤️ and way too many commits{" "}
                      <Text as="span" whiteSpace="nowrap">(fueled by ☕️)</Text>
                    </Text>
                    <Text as="span" fontSize="xs" color="fg.muted" textAlign={{ base: undefined, md: "right" }}>
                      <VersionInfo />
                      <br />
                      Powered by <Link href="https://nextjs.org/">Next.js</Link>
                      {" and "}
                      <Link href="https://chakra-ui.com/">Chakra UI</Link>
                    </Text>
                  </Stack>
                </Container>
              </footer>
            </SessionProvider>
          </Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function VersionInfo() {
  if (process.env.NEXT_PUBLIC_VERSION) {
    return <Badge size="xs" colorPalette="green">{process.env.NEXT_PUBLIC_VERSION}</Badge>;
  }

  if (process.env.NEXT_PUBLIC_COMMIT_SHA) {
    const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE ? new Date(process.env.NEXT_PUBLIC_BUILD_DATE) : null;

    return <Badge size="xs" colorPalette="orange">
      Commit: {process.env.NEXT_PUBLIC_COMMIT_SHA.substring(0, 7)}
      {buildDate ? <Text as="span">{" "}(Build at <ClientOnly>{buildDate.toLocaleString()}</ClientOnly>)</Text> : null}
    </Badge>;
  }

  return <Badge size="xs" colorPalette="red">Development Build</Badge>;
}

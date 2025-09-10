"use client";

import Link from "next/link";

import { Box, Flex, HStack, Button, Heading } from "@chakra-ui/react";
import { LuLogs, LuUsers } from "react-icons/lu";

import { ColorModeButton } from "@/components/ui/color-mode";

export default function AppNav() {
  return (
    <Box as="nav" mb={8}>
      {/* Main Navigation */}
      <Flex
        align="center"
        justify="space-between"
        // wrap="wrap"
        // borderBottom="1px"
        // borderColor="gray.200"
        _dark={{ borderColor: "gray.700" }}
      >
        {/* Logo and Brand */}
        <HStack>
          <Heading as="h1" size="xl" display="flex" alignItems="center">
            <Link href="/">
              <Box as="span">OverHours</Box>
            </Link>
            <Box as="span" fontSize="md" ml={2} fontWeight="normal" hideBelow="sm">
              CMS Robotics
            </Box>
          </Heading>
        </HStack>

        {/* Desktop Nav Links */}
        <HStack>
          <Link href="/logs" passHref>
            <Button variant="ghost">
              <LuLogs />
              Logs
            </Button>
          </Link>

          <Link href="/admin/users" passHref>
            <Button variant="ghost">
              <LuUsers />
              Users
            </Button>
          </Link>

          <ColorModeButton />
        </HStack>
      </Flex>
    </Box>
  );
}

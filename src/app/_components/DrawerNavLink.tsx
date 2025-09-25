"use client";
import React from "react";
import Link from "next/link";
import { Button, useDrawerContext } from "@chakra-ui/react";

export default function DrawerNavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const drawer = useDrawerContext();

  return (
    <Link href={href} passHref>
      <Button size="sm" variant="ghost" onClick={() => drawer.setOpen(false)}>
        {icon}
        {label}
      </Button>
    </Link>
  );
}

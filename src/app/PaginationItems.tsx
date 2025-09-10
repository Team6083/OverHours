"use client";

import { Pagination, IconButton } from "@chakra-ui/react";

export default function PaginationItems() {
  return (
    <Pagination.Items
      render={(page) => (
        <IconButton variant={{ base: "ghost", _selected: "outline" }}>
          {page.value}
        </IconButton>
      )}
    />
  );
}

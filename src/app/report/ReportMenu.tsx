"use client";
import { createListCollection, Heading, Listbox } from "@chakra-ui/react";
import { usePathname, useRouter } from "next/navigation";
import { Fragment } from "react";

const reports = {
  time: {
    label: "Time",
    items: [
      { label: "Daily", value: "daily" },
      { label: "Weekly", value: "weekly" },
    ],
  },
}
export default function ReportMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const collection = createListCollection({
    items: [
      { label: "Overview", value: "" },
      ...Object.values(reports)
        .map(group => group.items.map(item => ({ label: item.label, value: item.value })))
        .flat(),
    ],
  });

  return (
    <Listbox.Root
      collection={collection}
      width="full"
      value={[pathname.split("/")[2] || ""]}
      onSelect={(value) => router.push(`/report/${value.value}`)}
    >
      <Listbox.Content bg="transparent" border="none" p={0}>
        <Listbox.Item item={collection.at(0)}>
          <Listbox.ItemText>Overview</Listbox.ItemText>
        </Listbox.Item>

        {Object.entries(reports).map(([key, group]) => (<Fragment key={key}>
          <Heading as="h3" size="sm" mt={4} mb={2} fontWeight="semibold">
            {group.label}
          </Heading>

          {group.items.map(item => (
            <Listbox.Item key={item.value} item={collection.find(item.value)!}>
              <Listbox.ItemText>{item.label}</Listbox.ItemText>
            </Listbox.Item>
          ))}
        </Fragment>))}
      </Listbox.Content>
    </Listbox.Root>
  )
}

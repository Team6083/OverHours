import Link from "next/link";
import { HStack, Button, Icon, IconButton, Container } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { getStatRangeDTO } from "@/lib/data/statrange-dto";
import StatRangeForm from "./form";

export default async function SingleStatRangePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const isNew = id === "new";
  const statRangeDTO = !isNew ? await getStatRangeDTO(id) : null;

  return (<>
    <HStack mb={4} justifyContent="space-between">
      <Button size="xs" variant="ghost" asChild>
        <Link href="/admin/stat-ranges">
          <Icon><LuArrowLeft /></Icon>
          Back to Stat Ranges
        </Link>
      </Button>

      {statRangeDTO &&
        <IconButton size="xs" variant="ghost" colorPalette="red" asChild><Link href={`/admin/stat-ranges/${statRangeDTO?.id}/delete`}>
          <Icon><LuTrash2 /></Icon>
        </Link></IconButton>
      }
    </HStack>

    <Container>
      <StatRangeForm isNew={isNew} statRange={statRangeDTO ?? undefined} />
    </Container>
  </>);
}

import Link from "next/link";

import { Button, Container, HStack, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { getStatRangeDTO } from "@/lib/data/statrange-dto";
import DeleteStatRangesDialog from "../DeleteStatRangesDialog";
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
        <DeleteStatRangesDialog
          statRanges={[statRangeDTO]}
          redirectTo="/admin/stat-ranges"
          trigger={<IconButton size="xs" variant="ghost" colorPalette="red" aria-label="Delete">
            <Icon><LuTrash2 /></Icon>
          </IconButton>}
        />
      }
    </HStack>

    <Container>
      <StatRangeForm isNew={isNew} statRange={statRangeDTO ?? undefined} />
    </Container>
  </>);
}

import { Button, Card, Code, HStack, Heading, Icon, Stack, Text } from "@chakra-ui/react";
import { LuTrash2 } from "react-icons/lu";

import { maskUid } from "@/lib/cards";
import { CardDTO } from "@/lib/data/card-dto";
import { handleRemoveCard } from "./actions";

export default function Cards(props: { userId: string; cards: CardDTO[] }) {
  const { userId, cards } = props;

  return <Stack mt={8} gap={3}>
    <Heading size="md">Cards</Heading>
    <Text color="fg.muted" textStyle="sm">
      NFC cards (e.g. student IDs) that clock this user in or out on a card reader. To add one, tap it on the reader
      and open the link it shows; as an admin you can link it to this user there.
    </Text>

    {cards.length === 0 && <Text textStyle="sm">No cards.</Text>}

    {cards.map(card => (
      <Card.Root key={card.id} size="sm">
        <Card.Body>
          <HStack justify="space-between" wrap="wrap" gap={2}>
            <Stack gap={0}>
              <Code w="fit-content" title={card.uid}>{maskUid(card.uid)}</Code>
              <Text textStyle="xs" color="fg.muted">
                Linked {card.createdAt.toLocaleString()} · Last used {card.lastUsedAt?.toLocaleString() ?? "never"}
              </Text>
            </Stack>
            <form action={handleRemoveCard.bind(null, userId, card.id)}>
              <Button type="submit" size="xs" variant="outline" colorPalette="red">
                <Icon><LuTrash2 /></Icon> Remove
              </Button>
            </form>
          </HStack>
        </Card.Body>
      </Card.Root>
    ))}
  </Stack>;
}

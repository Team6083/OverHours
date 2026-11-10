import { Button, Card, Code, DataList, Heading, Icon, Stack, Text } from "@chakra-ui/react";
import { LuUnlink } from "react-icons/lu";

import { AccountDTO } from "@/lib/data/account-dto";
import { handleUnlinkAccount } from "./actions";

export default function LinkedAccounts(props: {
  userId: string;
  accounts: AccountDTO[];
}) {
  const { userId, accounts } = props;

  return <Stack mt={8} gap={3}>
    <Heading size="md">Linked Accounts</Heading>
    <Text color="fg.muted" textStyle="sm">
      Identity provider accounts this user signs in with. Unlinking keeps the user&apos;s data; the account&apos;s next
      sign-in links to the user with its email again, or creates a new user.
    </Text>

    {accounts.length === 0 && <Text textStyle="sm">No linked accounts. The next sign-in with this email links one.</Text>}

    {accounts.map(account => (
      <Card.Root key={account.id} size="sm">
        <Card.Body>
          <DataList.Root orientation="horizontal" size="sm">
            <DataList.Item>
              <DataList.ItemLabel>Provider</DataList.ItemLabel>
              <DataList.ItemValue><Code>{account.provider}</Code></DataList.ItemValue>
            </DataList.Item>
            <DataList.Item>
              <DataList.ItemLabel>Subject</DataList.ItemLabel>
              <DataList.ItemValue><Code>{account.subject}</Code></DataList.ItemValue>
            </DataList.Item>
            <DataList.Item>
              <DataList.ItemLabel>Issuer</DataList.ItemLabel>
              <DataList.ItemValue><Code>{account.issuer}</Code></DataList.ItemValue>
            </DataList.Item>
            <DataList.Item>
              <DataList.ItemLabel>Provider Email</DataList.ItemLabel>
              <DataList.ItemValue>
                {account.email}
                {account.emailTakenByOtherUser && <Text as="span" color="fg.warning" ms={2}>(another user has this email)</Text>}
              </DataList.ItemValue>
            </DataList.Item>
            <DataList.Item>
              <DataList.ItemLabel>Linked At</DataList.ItemLabel>
              <DataList.ItemValue>{account.createdAt.toLocaleString()}</DataList.ItemValue>
            </DataList.Item>
          </DataList.Root>
        </Card.Body>
        <Card.Footer>
          <form action={handleUnlinkAccount.bind(null, userId, account.id)}>
            <Button type="submit" size="xs" variant="outline" colorPalette="red">
              <Icon><LuUnlink /></Icon> Unlink
            </Button>
          </form>
        </Card.Footer>
      </Card.Root>
    ))}
  </Stack>;
}

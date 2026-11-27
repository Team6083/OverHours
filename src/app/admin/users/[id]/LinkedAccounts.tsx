import { Card, Code, Icon, Stack, Text } from "@chakra-ui/react";
import { FactList, TitleBar } from "@team6083/ui";
import { LuUnlink } from "react-icons/lu";

import WriteButton from "@/components/common/WriteButton";
import { AccountDTO } from "@/lib/data/account-dto";
import { handleUnlinkAccount } from "./actions";

export default function LinkedAccounts(props: {
  userId: string;
  accounts: AccountDTO[];
}) {
  const { userId, accounts } = props;

  return <Stack mt={8} gap={3}>
    <TitleBar
      title="Linked Accounts"
      size="md"
      description={<Text as="span" textStyle="sm">
        Identity provider accounts this user signs in with. Unlinking keeps the user&apos;s data; the account&apos;s next
        sign-in links to the user with its email again, or creates a new user.
      </Text>}
    />

    {accounts.length === 0 && <Text textStyle="sm">No linked accounts. The next sign-in with this email links one.</Text>}

    {accounts.map(account => (
      <Card.Root key={account.id} size="sm" minW={0}>
        <Card.Body>
          <FactList items={[
            { label: "Provider", value: <Code whiteSpace="normal" wordBreak="break-all">{account.provider}</Code> },
            { label: "Subject", value: <Code whiteSpace="normal" wordBreak="break-all">{account.subject}</Code> },
            { label: "Issuer", value: <Code whiteSpace="normal" wordBreak="break-all">{account.issuer}</Code> },
            {
              label: "Provider Email",
              value: <Text as="span" overflowWrap="anywhere">
                {account.email}
                {account.emailTakenByOtherUser && <Text as="span" color="fg.warning" ms={2}>(another user has this email)</Text>}
              </Text>,
            },
            { label: "Linked At", value: account.createdAt.toLocaleString() },
          ]} />
        </Card.Body>
        <Card.Footer>
          <form action={handleUnlinkAccount.bind(null, userId, account.id)}>
            <WriteButton type="submit" size="xs" variant="outline" colorPalette="red">
              <Icon><LuUnlink /></Icon> Unlink
            </WriteButton>
          </form>
        </Card.Footer>
      </Card.Root>
    ))}
  </Stack>;
}

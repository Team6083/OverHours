import { Container } from "@chakra-ui/react";

export default function MergeUsersLayout({ children }: { children: React.ReactNode }) {
  return <Container maxWidth="lg">{children}</Container>;
}

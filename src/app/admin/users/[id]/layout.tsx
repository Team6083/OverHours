import { Container, Card } from "@chakra-ui/react";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <Container maxWidth="lg">
    <Card.Root variant="elevated">
      <Card.Body>
        {children}
      </Card.Body>
    </Card.Root>
  </Container>;
}

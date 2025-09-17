import { Container, Card } from "@chakra-ui/react";

export default function LogLayout({ children }: { children: React.ReactNode }) {
  return <Container maxWidth="5xl">
    <Card.Root variant="elevated">
      <Card.Body>
        {children}
      </Card.Body>
    </Card.Root>
  </Container>;
}

import { Container, GridItem, SimpleGrid } from "@chakra-ui/react";
import ReportMenu from "./ReportMenu";


export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (<>
    <SimpleGrid columns={12}>
      <GridItem colSpan={{ base: 4, lg: 3 }} hideBelow="md">
        <ReportMenu />
      </GridItem>
      <GridItem colSpan={{ base: 12, md: 8, lg: 9 }}>
        <Container>{children}</Container>
      </GridItem>
    </SimpleGrid>
  </>);
}

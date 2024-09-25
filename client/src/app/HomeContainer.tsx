'use client';

import { Container, useTheme } from '@mui/material';

export default function HomeContainer({
  children,
}: Readonly<{
    children: React.ReactNode;
}>) {
  const theme = useTheme();

  return (
    <Container maxWidth="xl" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
      {children}
    </Container>
  );
}

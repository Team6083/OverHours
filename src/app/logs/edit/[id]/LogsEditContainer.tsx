'use client';

import { Container, useTheme } from '@mui/material';

export default function LogsEditContainer({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
      {children}
    </Container>
  );
}

'use client';

import { Alert, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import Link, { LinkProps } from 'next/link';
import { forwardRef } from 'react';

const ToLogsLink = forwardRef<HTMLAnchorElement, Omit<LinkProps, 'href'>>((props, ref) => (
  <Link href="/logs" ref={ref} {...props} />
));
ToLogsLink.displayName = 'ToLogsLink';

export default function NoPermission() {
  return (
    <>
      <Alert severity="error">
        You do not have permission to edit this time log.
        {' '}
        Please contact an administrator if you believe this is an error.
      </Alert>
      <Button
        component={ToLogsLink}
        variant="contained"
        color="primary"
        sx={{ marginTop: 2 }}
        startIcon={<ArrowBack />}
      >
        Back to Logs
      </Button>
    </>
  );
}

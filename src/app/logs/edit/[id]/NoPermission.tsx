'use client';

import { Alert, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { ArrowBack } from '@mui/icons-material';

export default function NoPermission() {
  const router = useRouter();

  return (
    <>
      <Alert severity="error">
        You do not have permission to edit this time log.
        {' '}
        Please contact an administrator if you believe this is an error.
      </Alert>
      <Button
        variant="contained"
        color="primary"
        onClick={() => router.push('/logs')}
        sx={{ marginTop: 2 }}
        startIcon={<ArrowBack />}
      >
        Back to Logs
      </Button>
    </>
  );
}

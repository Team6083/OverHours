'use client';

import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { redirect } from 'next/navigation';

import {
  Box,
  TextField,
  Typography,
  Container,
  CardContent as MuiCardContent,
  styled,
  FormControlLabel,
  Checkbox,
  Button,
  Link,
  Divider,
  Alert,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import SmartToyIcon from '@mui/icons-material/SmartToy';

import { signIn as nextSignIn, useSession } from 'next-auth/react';

import CardWithShadow from '@/components/CardWithShadow';
import { signin } from './actions';

const CardContent = styled(MuiCardContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: theme.spacing(2),
}));

function SignInButton() {
  const status = useFormStatus();
  const { pending } = status;

  return (
    <LoadingButton
      type="submit"
      fullWidth
      variant="contained"
      loading={pending}
    >
      Login
    </LoadingButton>
  );
}

export default function LoginPage() {
  const data = useSession();

  // Redirect to home page if user is already authenticated
  useEffect(() => {
    if (data.status === 'authenticated') {
      redirect('/');
    }
  }, [data]);

  const [state, action] = useActionState(signin, undefined);

  const errors = state && 'errors' in state && state?.errors ? state.errors : undefined;
  const message = state && 'message' in state && state?.message ? state.message : undefined;

  const emailError = !!(errors?.email && errors?.email?.length > 0);
  const emailErrorMessage = errors?.email?.join(', ');

  const passwordError = !!(errors?.password && errors?.password?.length > 0);
  const passwordErrorMessage = errors?.password?.join(', ');

  return (
    <Container
      maxWidth="xs"
      style={{
        marginTop: '10vh',
        marginBottom: '10vh',
      }}
    >
      <CardWithShadow variant="outlined">
        <CardContent>

          <Typography component="h1" variant="h4">
            Login to OverHours
          </Typography>
          <Box
            component="form"
            action={action}
            noValidate
            sx={{
              display: 'flex', flexDirection: 'column', width: '100%', gap: 2,
            }}
          >
            {
              message
              && <Alert severity="error">{message}</Alert>
            }

            <TextField
              error={emailError}
              helperText={emailErrorMessage}
              type="email"
              label="Email"
              name="email"
              placeholder="your@email.com"
              autoComplete="email"
              autoFocus
              required
              fullWidth
              variant="outlined"
              sx={{ ariaLabel: 'email' }}
            />

            <TextField
              error={passwordError}
              helperText={passwordErrorMessage}
              type="password"
              label="Password"
              name="password"
              placeholder="••••••"
              autoComplete="current-password"
              required
              fullWidth
              variant="outlined"
            />
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            <SignInButton />
            <Typography sx={{ textAlign: 'center' }}>
              Don&apos;t have an account?
              {' '}
              <span>
                <Link
                  href="/login"
                  variant="body2"
                  sx={{ alignSelf: 'center' }}
                >
                  Sign up
                </Link>
              </span>
            </Typography>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => nextSignIn('keycloak')}
              startIcon={<SmartToyIcon />}
            >
              Login with CMS Robotics SSO
            </Button>
          </Box>
        </CardContent>
      </CardWithShadow>
    </Container>
  );
}

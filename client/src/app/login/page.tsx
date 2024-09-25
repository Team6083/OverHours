'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { redirect, useRouter } from 'next/navigation';

import {
  Box,
  FormControl,
  FormLabel,
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

import { signin } from '@/app/actions/auth';
import CardWithShadow from '@/components/CardWithShadow';

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
      Sign in
    </LoadingButton>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const data = useSession();

  // Redirect to home page if user is already authenticated
  useEffect(() => {
    if (data.status === 'authenticated') {
      redirect('/');
    }
  }, [data]);

  const [state, action] = useFormState(signin, undefined);

  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      // FIXME: This is a workaround to reload the page after successful login
      window.location.reload();
    }
  }, [router, state]);

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

          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            action={action}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            {
              message
              && <Alert severity="error">{message}</Alert>
            }

            <FormControl>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? 'error' : 'primary'}
                sx={{ ariaLabel: 'email' }}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={passwordError ? 'error' : 'primary'}
              />
            </FormControl>
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
                  href="/material-ui/getting-started/templates/sign-in/"
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
              Sign in with CMS Robotics SSO
            </Button>
          </Box>
        </CardContent>
      </CardWithShadow>
    </Container>
  );
}

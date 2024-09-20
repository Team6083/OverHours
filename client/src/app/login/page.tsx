"use client";

import { useFormState, useFormStatus } from "react-dom";
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
    Alert
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import SmartToyIcon from '@mui/icons-material/SmartToy';

import { CardWithShadow } from "@/components/CardWithShadow";
import { signin } from "@/app/actions/auth";

const CardContent = styled(MuiCardContent)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: theme.spacing(2),
}));

export default function LoginPage() {
    const [state, action] = useFormState(signin, undefined);

    const emailError = state?.errors?.email && state?.errors?.email?.length > 0 ? true : false;
    const emailErrorMessage = state?.errors?.email?.join(', ');

    const passwordError = state?.errors?.password && state?.errors?.password?.length > 0 ? true : false;
    const passwordErrorMessage = state?.errors?.password?.join(', ');

    return (
        <Container maxWidth="xs" style={{
            marginTop: '10vh',
            marginBottom: '10vh',
        }}>
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
                            state?.message &&
                            <Alert severity="error">{state.message}</Alert>
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
                            Don&apos;t have an account?{' '}
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
                            onClick={() => alert('Sign in with CMS Robotics SSO')}
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

function SignInButton() {
    const status = useFormStatus();
    const { pending } = status;

    console.log(status);

    return <LoadingButton
        type="submit"
        fullWidth
        variant="contained"
        loading={pending}
    >
        Sign in
    </LoadingButton>;
}

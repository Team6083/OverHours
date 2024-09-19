"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    Divider
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSnackbar } from "notistack";

import { CardWithShadow } from "@/components/CardWithShadow";
import { login, setAuthToken } from "@/auth";

const CardContent = styled(MuiCardContent)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: theme.spacing(2),
}));

export default function LoginPage() {
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [emailError, setEmailError] = useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = useState('');

    const [passwordError, setPasswordError] = useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

    const [loginLoading, setLoginLoading] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        let isValid = true;
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setEmailError(true);
            setEmailErrorMessage('Please enter a valid email address.');
            isValid = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage('');
        }

        if (!password) {
            setPasswordError(true);
            setPasswordErrorMessage('Please enter a valid password.');
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }

        if (!isValid) return;

        setLoginLoading(true);
        login(email, password)
            .then((token) => {
                if (!token) {
                    enqueueSnackbar('No token received', { variant: 'error' });
                    return;
                }

                setAuthToken(token);
                router.push('/');
            })
            .catch((error) => {
                const errMessage = error.response?.data?.error;

                if (errMessage) {
                    enqueueSnackbar(errMessage, { variant: 'warning' });
                } else {
                    enqueueSnackbar('An error occurred while logging in', { variant: 'error' });
                    console.error(error);
                }
            })
            .finally(() => setLoginLoading(false));
    }

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
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 2,
                        }}
                    >
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
                                onChange={(event) => setEmail(event.target.value)}
                                value={email}
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
                                onChange={(event) => setPassword(event.target.value)}
                                value={password}
                            />
                        </FormControl>
                        <FormControlLabel
                            control={<Checkbox value="remember" color="primary" />}
                            label="Remember me"
                        />
                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            loading={loginLoading}
                        >
                            Sign in
                        </LoadingButton>
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

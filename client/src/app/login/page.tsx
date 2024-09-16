"use client";

import { Box, FormControl, FormLabel, TextField, Typography, Container, CardContent as MuiCardContent, styled, FormControlLabel, Checkbox, Button, Link, Divider } from "@mui/material";
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { CardWithShadow } from "@/components/CardWithShadow";

const CardContent = styled(MuiCardContent)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: theme.spacing(2),
}));

export default function LoginPage() {

    const emailError = false;
    const emailErrorMessage = emailError ? 'Please enter a valid email address' : '';

    const passwordError = false;
    const passwordErrorMessage = passwordError ? 'Please enter a valid password' : '';

    const handleSubmit = () => {

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
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            onClick={() => { }}
                        >
                            Sign in
                        </Button>
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
                            type="submit"
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

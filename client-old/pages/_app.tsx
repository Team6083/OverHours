import '../styles/globals.css'
import type {AppProps} from 'next/app'
import {AppBar, Button, ThemeProvider, Toolbar, Typography} from "@mui/material";
import theme from "../src/theme";

function MyApp({Component, pageProps}: AppProps) {
    return (
        <ThemeProvider theme={theme}>
            <AppBar position={"fixed"}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}} style={{
                        fontWeight: 400
                    }}>
                        OverHours
                    </Typography>
                    <Button color="secondary" variant="contained">Login</Button>
                </Toolbar>
            </AppBar>
            <Component {...pageProps} />
        </ThemeProvider>
    );
}

export default MyApp

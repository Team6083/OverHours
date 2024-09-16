import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// Create a theme instance.
const theme = createTheme({
    palette: {
        primary: {
            main: '#ffffff',
        },
        secondary: {
            main: '#1976d2',
        },
        error: {
            main: red.A400,
        }
    },
    typography: {
        fontWeightRegular: 400
    }
});

export default theme;
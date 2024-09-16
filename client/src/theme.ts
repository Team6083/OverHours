'use client';
import { outlinedInputClasses } from '@mui/material';
import { alpha, createTheme } from '@mui/material/styles';

const defaultTheme = createTheme();

const typography = {
    fontFamily: ['"Inter", "sans-serif"'].join(','),
    h1: {
        fontSize: defaultTheme.typography.pxToRem(48),
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: defaultTheme.typography.pxToRem(36),
        fontWeight: 600,
        lineHeight: 1.2,
    },
    h3: {
        fontSize: defaultTheme.typography.pxToRem(30),
        lineHeight: 1.2,
    },
    h4: {
        fontSize: defaultTheme.typography.pxToRem(24),
        fontWeight: 600,
        lineHeight: 1.5,
    },
    h5: {
        fontSize: defaultTheme.typography.pxToRem(20),
        fontWeight: 600,
    },
    h6: {
        fontSize: defaultTheme.typography.pxToRem(18),
        fontWeight: 600,
    },
    subtitle1: {
        fontSize: defaultTheme.typography.pxToRem(18),
    },
    subtitle2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 500,
    },
    body1: {
        fontSize: defaultTheme.typography.pxToRem(14),
    },
    body2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 400,
    },
    caption: {
        fontSize: defaultTheme.typography.pxToRem(12),
        fontWeight: 400,
    },
};

const theme = createTheme({
    typography,
    colorSchemes: {
        dark: true,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: (theme.vars || theme).shape.borderRadius,
                }),
            },
        },
        MuiButton: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: (theme.vars || theme).shape.borderRadius,
                    textTransform: 'none',
                }),
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    border: 'none',
                },
                input: ({ theme }) => ({
                    '&::placeholder': {
                        opacity: 0.7,
                        color: theme.palette.grey[500],
                    },
                }),
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                input: {
                    padding: 0,
                },
                root: ({ theme }) => ({
                    padding: '8px 12px',
                    color: (theme.vars || theme).palette.text.primary,
                    borderRadius: (theme.vars || theme).shape.borderRadius,
                    border: `1px solid ${(theme.vars || theme).palette.divider}`,
                    backgroundColor: (theme.vars || theme).palette.background.default,
                    transition: 'border 120ms ease-in',
                    '&:hover': {
                        borderColor: theme.palette.grey[400],
                    },
                    [`&.${outlinedInputClasses.focused}`]: {
                        outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                        borderColor: theme.palette.primary.main,
                    },
                    ...theme.applyStyles('dark', {
                        '&:hover': {
                            borderColor: theme.palette.grey[500],
                        },
                    }),
                    variants: [
                        {
                            props: {
                                size: 'small',
                            },
                            style: {
                                height: '2.25rem',
                            },
                        },
                        {
                            props: {
                                size: 'medium',
                            },
                            style: {
                                height: '2.5rem',
                            },
                        },
                    ],
                }),
                notchedOutline: {
                    border: 'none',
                },
            },
        },
        MuiInputAdornment: {
            styleOverrides: {
                root: ({ theme }) => ({
                    color: (theme.vars || theme).palette.grey[500],
                    ...theme.applyStyles('dark', {
                        color: (theme.vars || theme).palette.grey[400],
                    }),
                }),
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                root: ({ theme }) => ({
                    typography: theme.typography.caption,
                    marginBottom: 8,
                }),
            },
        },
    }
});

export default theme;
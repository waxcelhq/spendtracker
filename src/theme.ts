import { createTheme, useColorScheme } from '@mui/material/styles'

const shared = {
  primary: { main: '#1A73E8', contrastText: '#ffffff' },
}

export const schemeColors = {
  light: {
    credit: '#188038',
    debit: '#D93025',
    frame: '#E8EAED',
    chart: ['#1A73E8', '#188038', '#E37400', '#9334E6', '#C5221F', '#007B83', '#F9AB00', '#5F6368'],
  },
  dark: {
    credit: '#81C995',
    debit: '#F28B82',
    frame: '#121314',
    chart: ['#8AB4F8', '#81C995', '#F9AB00', '#D7AEFB', '#F28B82', '#78D9EC', '#FDD663', '#BDC1C6'],
  },
} as const

export function useSchemeColors() {
  const { mode, systemMode } = useColorScheme()
  const resolved = mode === 'dark' || mode === 'light' ? mode : systemMode
  return schemeColors[resolved === 'dark' ? 'dark' : 'light']
}

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data',
  },
  colorSchemes: {
    light: {
      palette: {
        ...shared,
        background: { default: '#FAFAFA', paper: '#ffffff' },
        text: { primary: '#202124', secondary: '#5F6368' },
        divider: '#DADCE0',
      },
    },
    dark: {
      palette: {
        ...shared,
        AppBar: { darkBg: '#1A73E8', darkColor: '#ffffff' },
        background: { default: '#202124', paper: '#303134' },
        text: { primary: '#E8EAED', secondary: '#9AA0A6' },
        divider: '#3C4043',
      },
    },
  },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 4 },
      },
    },
  },
})

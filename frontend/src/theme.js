import { createTheme } from '@mui/material/styles';

// Design direction: a calm, editorial "ledger" aesthetic for a compensation tool.
// Ink-navy + a single restrained sage accent, Fraunces for display, Inter for UI,
// IBM Plex Mono for figures (money should read like data). Deliberately NOT default
// MUI blue, and deliberately NOT the cream/terracotta AI-default look.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1f3a34', contrastText: '#f7f5ef' }, // deep pine
    secondary: { main: '#b08442' }, // muted brass accent
    background: { default: '#f4f2ec', paper: '#ffffff' }, // warm paper, but paired w/ pine not terracotta
    text: { primary: '#1c1e1d', secondary: '#5c625f' },
    success: { main: '#3f7d5c' },
    error: { main: '#a4443b' },
    divider: 'rgba(31,58,52,0.12)',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h4: { fontFamily: 'Fraunces, serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontFamily: 'Fraunces, serif', fontWeight: 600 },
    h6: { fontFamily: 'Fraunces, serif', fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.72rem' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiPaper: { styleOverrides: { root: { border: '1px solid rgba(31,58,52,0.1)' } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid rgba(31,58,52,0.1)' } } },
  },
});

// Monospace helper for money figures.
export const MONO = 'IBM Plex Mono, ui-monospace, monospace';

export default theme;

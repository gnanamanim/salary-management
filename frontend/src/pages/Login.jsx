import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography, Alert, Stack,
} from '@mui/material';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('hr.manager@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Those credentials don’t match an account. Check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        bgcolor: 'primary.main',
        backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(176,132,66,0.18), transparent 40%)',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: 380, maxWidth: '100%' }} elevation={0}>
        <Typography variant="h4" sx={{ mb: 0.5 }}>ACME · Ledger</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Compensation management for the HR team.
        </Typography>
        <form onSubmit={submit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Work email" type="email" value={email} fullWidth
              onChange={(e) => setEmail(e.target.value)} autoComplete="username"
            />
            <TextField
              label="Password" type="password" value={password} fullWidth
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </form>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Seeded demo login is pre-filled.
        </Typography>
      </Paper>
    </Box>
  );
}

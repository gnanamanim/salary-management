import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Button, Container, Stack,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import GroupsIcon from '@mui/icons-material/Groups';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EmployeeList from './pages/EmployeeList.jsx';
import EmployeeDetail from './pages/EmployeeDetail.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navItem = (to, label, icon) => {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <Button
        component={Link}
        to={to}
        startIcon={icon}
        sx={{
          color: 'primary.contrastText',
          opacity: active ? 1 : 0.7,
          borderBottom: active ? '2px solid' : '2px solid transparent',
          borderColor: active ? 'secondary.main' : 'transparent',
          borderRadius: 0,
          px: 1.5,
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ fontFamily: 'Fraunces, serif', color: 'inherit', textDecoration: 'none', mr: 3, letterSpacing: '-0.02em' }}
          >
            ACME · Ledger
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {navItem('/', 'Overview', <InsightsIcon fontSize="small" />)}
            {navItem('/employees', 'Employees', <GroupsIcon fontSize="small" />)}
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.8, mr: 2 }}>{user?.name}</Typography>
          <Button color="inherit" size="small" startIcon={<LogoutIcon fontSize="small" />} onClick={logout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<RequireAuth><Shell><Dashboard /></Shell></RequireAuth>}
      />
      <Route
        path="/employees"
        element={<RequireAuth><Shell><EmployeeList /></Shell></RequireAuth>}
      />
      <Route
        path="/employees/:id"
        element={<RequireAuth><Shell><EmployeeDetail /></Shell></RequireAuth>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack, Button, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert, Breadcrumbs, Link as MLink, Skeleton,
} from '@mui/material';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { employees } from '../api.js';
import { usd, local } from '../format.js';
import { MONO } from '../theme.js';

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value}</Typography>
    </Box>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('raise');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([employees.get(id), employees.history(id)])
      .then(([e, h]) => { setEmp(e); setHistory(h); })
      .catch(() => setError('Could not load this employee.'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openEdit = () => {
    setAmount(emp?.salary_minor ? String(emp.salary_minor / 100) : '');
    setReason('raise');
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await employees.changeSalary(id, { amount: Number(amount), currency: emp.currency, reason });
      setOpen(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save the change.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !emp) return <Alert severity="error">{error}</Alert>;
  if (!emp) return <Skeleton variant="rounded" height={400} />;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MLink component={Link} to="/employees" underline="hover" color="inherit">Employees</MLink>
        <Typography color="text.primary">{emp.first_name} {emp.last_name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">{emp.first_name} {emp.last_name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {emp.job_title} · {emp.department} · {emp.employee_no}
          </Typography>
        </Box>
        <Chip
          label={emp.status}
          color={emp.status === 'active' ? 'success' : 'default'}
          variant={emp.status === 'active' ? 'filled' : 'outlined'}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Profile</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}><Field label="Email" value={emp.email} /></Grid>
                <Grid item xs={6}><Field label="Level" value={emp.level} /></Grid>
                <Grid item xs={6}><Field label="Country" value={emp.country} /></Grid>
                <Grid item xs={6}><Field label="Currency" value={emp.currency} /></Grid>
                <Grid item xs={6}><Field label="Gender" value={emp.gender || '—'} /></Grid>
                <Grid item xs={6}><Field label="Hired" value={new Date(emp.hire_date).toLocaleDateString()} /></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card elevation={0}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Current compensation</Typography>
                <Button variant="contained" size="small" startIcon={<EditIcon />} onClick={openEdit}>
                  Adjust salary
                </Button>
              </Stack>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Local</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: '1.6rem' }}>
                    {local(emp.salary_minor, emp.currency, emp.symbol)}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Normalized (USD)</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: '1.6rem' }}>{usd(emp.salary_usd)}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Salary history</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Every change is recorded — an immutable audit trail.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Effective from</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{new Date(h.effective_from).toLocaleDateString()}</TableCell>
                      <TableCell>{h.effective_to ? new Date(h.effective_to).toLocaleDateString() : <Chip size="small" label="current" color="success" />}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{h.reason}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: MONO }}>{local(h.amount_minor, h.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Adjust salary</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            New annual gross in {emp.currency}. The current record is closed and a new one opened.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={`Amount (${emp.currency})`} type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)} fullWidth autoFocus
            />
            <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth SelectProps={{ native: true }}>
              <option value="raise">Raise</option>
              <option value="adjustment">Adjustment</option>
              <option value="promotion">Promotion</option>
              <option value="correction">Correction</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !amount}>
            {saving ? 'Saving…' : 'Save change'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

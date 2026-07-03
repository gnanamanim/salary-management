import { useEffect, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Stack, ToggleButtonGroup,
  ToggleButton, Table, TableBody, TableCell, TableHead, TableRow, Chip, Skeleton, Alert,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { analytics } from '../api.js';
import { usd, compact } from '../format.js';
import { MONO } from '../theme.js';

function StatCard({ label, value, sub }) {
  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '1.7rem', fontWeight: 500, mt: 0.5 }}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

const ACCENT = '#1f3a34';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [dimension, setDimension] = useState('department');
  const [byDim, setByDim] = useState([]);
  const [dist, setDist] = useState([]);
  const [top, setTop] = useState([]);
  const [payGap, setPayGap] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      analytics.summary(), analytics.distribution(),
      analytics.topEarners(8), analytics.payGap(),
    ])
      .then(([s, d, t, pg]) => { setSummary(s); setDist(d); setTop(t); setPayGap(pg); })
      .catch(() => setError('Could not load analytics. Is the API running and seeded?'));
  }, []);

  useEffect(() => {
    analytics.by(dimension).then(setByDim).catch(() => {});
  }, [dimension]);

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>How ACME pays people</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        All figures normalized to USD across {summary ? summary.headcount.toLocaleString() : '—'} active employees.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          {summary ? <StatCard label="Active headcount" value={summary.headcount.toLocaleString()} />
            : <Skeleton variant="rounded" height={110} />}
        </Grid>
        <Grid item xs={6} md={3}>
          {summary ? <StatCard label="Annual spend" value={compact(summary.total_spend_usd)} sub="total base, USD" />
            : <Skeleton variant="rounded" height={110} />}
        </Grid>
        <Grid item xs={6} md={3}>
          {summary ? <StatCard label="Average salary" value={usd(summary.avg_usd)} sub="USD" />
            : <Skeleton variant="rounded" height={110} />}
        </Grid>
        <Grid item xs={6} md={3}>
          {summary ? <StatCard label="Median salary" value={usd(summary.median_usd)} sub="USD" />
            : <Skeleton variant="rounded" height={110} />}
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card elevation={0}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Average pay by</Typography>
                <ToggleButtonGroup
                  size="small" exclusive value={dimension}
                  onChange={(_, v) => v && setDimension(v)}
                >
                  <ToggleButton value="department">Department</ToggleButton>
                  <ToggleButton value="country">Country</ToggleButton>
                  <ToggleButton value="level">Level</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={byDim} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(31,58,52,0.08)" />
                  <XAxis type="number" tickFormatter={(v) => compact(v)} fontSize={12} />
                  <YAxis type="category" dataKey="key" width={110} fontSize={12} />
                  <Tooltip formatter={(v) => usd(v)} cursor={{ fill: 'rgba(31,58,52,0.04)' }} />
                  <Bar dataKey="avg_usd" radius={[0, 4, 4, 0]}>
                    {byDim.map((_, i) => <Cell key={i} fill={ACCENT} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Salary distribution (USD)</Typography>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dist}>
                  <CartesianGrid vertical={false} stroke="rgba(31,58,52,0.08)" />
                  <XAxis dataKey="band" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip cursor={{ fill: 'rgba(31,58,52,0.04)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#b08442" fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Top earners</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell align="right">Salary (USD)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {top.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell>{e.first_name} {e.last_name}</TableCell>
                      <TableCell>{e.department}</TableCell>
                      <TableCell><Chip size="small" label={e.level} variant="outlined" /></TableCell>
                      <TableCell align="right" sx={{ fontFamily: MONO }}>{usd(e.salary_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Pay by gender</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                A first-pass equity signal (unadjusted for role/level/geography).
              </Typography>
              {payGap && (
                <>
                  <Table size="small">
                    <TableBody>
                      {payGap.byGender.map((g) => (
                        <TableRow key={g.key}>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{g.key || 'unspecified'}</TableCell>
                          <TableCell align="right">{g.headcount.toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: MONO }}>{usd(g.avg_usd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {payGap.femaleVsMaleGapPct != null && (
                    <Alert
                      severity={Math.abs(payGap.femaleVsMaleGapPct) < 3 ? 'success' : 'warning'}
                      sx={{ mt: 2 }}
                    >
                      Unadjusted female-vs-male gap: <b>{payGap.femaleVsMaleGapPct}%</b>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

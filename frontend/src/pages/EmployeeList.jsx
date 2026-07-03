import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, TextField, MenuItem, Stack, Chip, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import { employees } from '../api.js';
import { usd, local } from '../format.js';
import { MONO } from '../theme.js';

const columns = [
  { field: 'employee_no', headerName: 'ID', width: 110 },
  {
    field: 'name', headerName: 'Name', flex: 1, minWidth: 160, sortable: true,
    valueGetter: (_, row) => `${row.first_name} ${row.last_name}`,
  },
  { field: 'department', headerName: 'Department', width: 150 },
  { field: 'country', headerName: 'Country', width: 140 },
  {
    field: 'level', headerName: 'Level', width: 90,
    renderCell: (p) => <Chip size="small" variant="outlined" label={p.value} />,
  },
  {
    field: 'salary_local', headerName: 'Local salary', width: 160, sortable: false,
    renderCell: (p) => (
      <span style={{ fontFamily: MONO }}>{local(p.row.salary_minor, p.row.currency)}</span>
    ),
  },
  {
    field: 'salary_usd', headerName: 'Salary (USD)', width: 140,
    renderCell: (p) => <span style={{ fontFamily: MONO }}>{usd(p.value)}</span>,
  },
  {
    field: 'status', headerName: 'Status', width: 120,
    renderCell: (p) => (
      <Chip
        size="small"
        label={p.value}
        color={p.value === 'active' ? 'success' : 'default'}
        variant={p.value === 'active' ? 'filled' : 'outlined'}
      />
    ),
  },
];

export default function EmployeeList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'name', sort: 'asc' }]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: '', country: '', level: '', status: '' });
  const [options, setOptions] = useState({ departments: [], countries: [], levels: [] });

  useEffect(() => { employees.filters().then(setOptions).catch(() => {}); }, []);

  const fetchRows = useCallback(() => {
    setLoading(true);
    const sort = sortModel[0];
    employees.list({
      page: paginationModel.page + 1,
      limit: paginationModel.pageSize,
      search: search || undefined,
      sort: sort?.field,
      dir: sort?.sort,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    })
      .then((res) => { setRows(res.data); setRowCount(res.total); })
      .finally(() => setLoading(false));
  }, [paginationModel, sortModel, search, filters]);

  // Debounce search; refetch on any dependency change.
  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Employees</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {rowCount.toLocaleString()} people. Search and filters run on the server.
      </Typography>

      <Card elevation={0} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            size="small" placeholder="Search name or email" value={search}
            onChange={(e) => { setSearch(e.target.value); setPaginationModel((m) => ({ ...m, page: 0 })); }}
            sx={{ flexGrow: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField size="small" select label="Department" value={filters.department} onChange={setFilter('department')} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {options.departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Country" value={filters.country} onChange={setFilter('country')} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {options.countries.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Level" value={filters.level} onChange={setFilter('level')} sx={{ minWidth: 110 }}>
            <MenuItem value="">All</MenuItem>
            {options.levels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Status" value={filters.status} onChange={setFilter('status')} sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="terminated">Terminated</MenuItem>
          </TextField>
        </Stack>
      </Card>

      <Card elevation={0} sx={{ height: 620 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          paginationMode="server"
          sortingMode="server"
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          disableColumnMenu
          onRowClick={(p) => navigate(`/employees/${p.id}`)}
          sx={{
            border: 0,
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(31,58,52,0.04)' },
          }}
        />
      </Card>
    </Box>
  );
}

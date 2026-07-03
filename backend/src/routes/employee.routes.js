import { Router } from 'express';
import { requireAuth } from '../services/auth.js';
import { parsePagination, validateSalaryChange } from '../services/validation.js';
import {
  listEmployees, getEmployee, getSalaryHistory, changeSalary, getFilterOptions,
} from '../repositories/employeeRepo.js';

const router = Router();
router.use(requireAuth);

// GET /api/employees — paginated list with search + filters + sort
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { search, department, country, level, status, sort, dir } = req.query;
    const result = await listEmployees({
      search, department, country, level, status, sort, dir, limit, offset,
    });
    res.json({ ...result, page, limit });
  } catch (err) { next(err); }
});

// GET /api/employees/filters — distinct values for UI dropdowns
router.get('/filters', async (req, res, next) => {
  try {
    res.json(await getFilterOptions());
  } catch (err) { next(err); }
});

// GET /api/employees/:id
router.get('/:id', async (req, res, next) => {
  try {
    const emp = await getEmployee(Number(req.params.id));
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    return res.json(emp);
  } catch (err) { return next(err); }
});

// GET /api/employees/:id/salary-history
router.get('/:id/salary-history', async (req, res, next) => {
  try {
    res.json(await getSalaryHistory(Number(req.params.id)));
  } catch (err) { next(err); }
});

// POST /api/employees/:id/salary — record a salary change (append-only)
router.post('/:id/salary', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const emp = await getEmployee(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const { amountMinor, currency, reason } = validateSalaryChange(req.body);
    const row = await changeSalary(id, {
      amountMinor,
      currency: currency || emp.currency,
      reason,
      changedBy: req.user?.sub,
    });
    return res.status(201).json(row);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    return next(err);
  }
});

export default router;

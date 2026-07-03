import { query } from '../db/pool.js';
import { safeSortColumn, safeSortDir } from '../services/validation.js';

const SORTABLE = {
  name: 'e.last_name',
  department: 'e.department',
  country: 'e.country',
  level: 'e.level',
  salary_usd: 'salary_usd',
  hire_date: 'e.hire_date',
};

/**
 * Paginated, filtered, sorted list of employees with their current salary (local + USD).
 * All aggregation/pagination happens in Postgres — never load 10k rows into Node.
 */
export async function listEmployees({ search, department, country, level, status, sort, dir, limit, offset }) {
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`(lower(e.first_name) LIKE $${params.length} OR lower(e.last_name) LIKE $${params.length} OR lower(e.email) LIKE $${params.length})`);
  }
  if (department) { params.push(department); where.push(`e.department = $${params.length}`); }
  if (country)    { params.push(country);    where.push(`e.country = $${params.length}`); }
  if (level)      { params.push(level);      where.push(`e.level = $${params.length}`); }
  if (status)     { params.push(status);     where.push(`e.status = $${params.length}`); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortCol = safeSortColumn(sort, Object.keys(SORTABLE), 'name');
  const orderCol = SORTABLE[sortCol];
  const orderDir = safeSortDir(dir);

  const baseFrom = `
    FROM employees e
    JOIN currency_rates cr ON cr.currency = e.currency
    LEFT JOIN salary_history s ON s.employee_id = e.id AND s.effective_to IS NULL
  `;

  const dataSql = `
    SELECT
      e.id, e.employee_no, e.first_name, e.last_name, e.email,
      e.department, e.job_title, e.level, e.country, e.currency, e.status, e.hire_date,
      s.amount_minor AS salary_minor,
      ROUND(s.amount_minor * cr.rate_to_usd)::bigint AS salary_usd
    ${baseFrom}
    ${whereSql}
    ORDER BY ${orderCol} ${orderDir}, e.id ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countSql = `SELECT COUNT(*)::int AS total ${baseFrom} ${whereSql}`;

  const [rows, count] = await Promise.all([
    query(dataSql, [...params, limit, offset]),
    query(countSql, params),
  ]);

  return { data: rows.rows, total: count.rows[0].total };
}

export async function getEmployee(id) {
  const sql = `
    SELECT
      e.*, cr.rate_to_usd, cr.symbol,
      s.amount_minor AS salary_minor,
      ROUND(s.amount_minor * cr.rate_to_usd)::bigint AS salary_usd
    FROM employees e
    JOIN currency_rates cr ON cr.currency = e.currency
    LEFT JOIN salary_history s ON s.employee_id = e.id AND s.effective_to IS NULL
    WHERE e.id = $1
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

export async function getSalaryHistory(employeeId) {
  const sql = `
    SELECT id, amount_minor, currency, effective_from, effective_to, reason, created_at
    FROM salary_history
    WHERE employee_id = $1
    ORDER BY effective_from DESC, id DESC
  `;
  const { rows } = await query(sql, [employeeId]);
  return rows;
}

/**
 * Record a salary change: close the current row and open a new one, atomically.
 * This preserves the full audit trail (append-only history).
 */
export async function changeSalary(employeeId, { amountMinor, currency, reason, changedBy }) {
  const client = await (await import('../db/pool.js')).pool.connect();
  try {
    await client.query('BEGIN');
    const today = new Date().toISOString().slice(0, 10);
    await client.query(
      `UPDATE salary_history SET effective_to = $1
       WHERE employee_id = $2 AND effective_to IS NULL`,
      [today, employeeId],
    );
    const insert = await client.query(
      `INSERT INTO salary_history (employee_id, amount_minor, currency, effective_from, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employeeId, amountMinor, currency, today, reason || 'adjustment', changedBy || null],
    );
    await client.query('COMMIT');
    return insert.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Distinct filter values for populating dropdowns in the UI. */
export async function getFilterOptions() {
  const [dept, country, level] = await Promise.all([
    query('SELECT DISTINCT department FROM employees ORDER BY department'),
    query('SELECT DISTINCT country FROM employees ORDER BY country'),
    query('SELECT DISTINCT level FROM employees ORDER BY level'),
  ]);
  return {
    departments: dept.rows.map((r) => r.department),
    countries: country.rows.map((r) => r.country),
    levels: level.rows.map((r) => r.level),
  };
}

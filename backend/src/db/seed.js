import 'dotenv/config';
import { pool, closePool } from './pool.js';
import { hashPassword } from '../services/auth.js';

// Deterministic PRNG (mulberry32) so seeding is reproducible across runs.
function mulberry32(seed) {
  return function rng() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

const TOTAL_EMPLOYEES = 10_000;

// Country -> currency + a rough salary multiplier (relative to a US baseline).
const COUNTRIES = [
  { country: 'United States', currency: 'USD', mult: 1.0 },
  { country: 'United Kingdom', currency: 'GBP', mult: 0.72 },
  { country: 'Germany', currency: 'EUR', mult: 0.78 },
  { country: 'France', currency: 'EUR', mult: 0.72 },
  { country: 'India', currency: 'INR', mult: 45.0 },
  { country: 'Canada', currency: 'CAD', mult: 1.15 },
  { country: 'Australia', currency: 'AUD', mult: 1.25 },
  { country: 'Singapore', currency: 'SGD', mult: 1.1 },
  { country: 'Brazil', currency: 'BRL', mult: 3.2 },
  { country: 'Japan', currency: 'JPY', mult: 110.0 },
];

// currency -> rate_to_usd (static reference data; a real system pulls a daily feed).
const RATES = [
  { currency: 'USD', rate_to_usd: 1.0, symbol: '$' },
  { currency: 'GBP', rate_to_usd: 1.27, symbol: '£' },
  { currency: 'EUR', rate_to_usd: 1.08, symbol: '€' },
  { currency: 'INR', rate_to_usd: 0.012, symbol: '₹' },
  { currency: 'CAD', rate_to_usd: 0.73, symbol: 'C$' },
  { currency: 'AUD', rate_to_usd: 0.66, symbol: 'A$' },
  { currency: 'SGD', rate_to_usd: 0.74, symbol: 'S$' },
  { currency: 'BRL', rate_to_usd: 0.20, symbol: 'R$' },
  { currency: 'JPY', rate_to_usd: 0.0067, symbol: '¥' },
];

const DEPARTMENTS = [
  { name: 'Engineering', base: 130_000, titles: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager'] },
  { name: 'Product', base: 125_000, titles: ['Product Manager', 'Senior PM', 'Group PM', 'Product Designer'] },
  { name: 'Sales', base: 95_000, titles: ['Account Executive', 'Sales Manager', 'SDR', 'VP Sales'] },
  { name: 'Marketing', base: 90_000, titles: ['Marketing Specialist', 'Content Lead', 'Growth Manager', 'CMO Office'] },
  { name: 'Finance', base: 100_000, titles: ['Financial Analyst', 'Accountant', 'Finance Manager', 'Controller'] },
  { name: 'HR', base: 85_000, titles: ['HR Generalist', 'Recruiter', 'HRBP', 'People Ops Lead'] },
  { name: 'Operations', base: 80_000, titles: ['Ops Analyst', 'Ops Manager', 'Program Manager', 'Coordinator'] },
  { name: 'Customer Success', base: 82_000, titles: ['CSM', 'Support Engineer', 'Success Lead', 'Support Rep'] },
];

// level -> salary multiplier applied to the department base.
const LEVELS = [
  { level: 'L1', mult: 0.70 }, { level: 'L2', mult: 0.85 }, { level: 'L3', mult: 1.0 },
  { level: 'L4', mult: 1.25 }, { level: 'L5', mult: 1.6 }, { level: 'L6', mult: 2.1 },
  { level: 'L7', mult: 3.0 },
];

const FIRST_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Priya', 'Wei', 'Yuki', 'Liam', 'Emma', 'Noah', 'Olivia', 'Aarav', 'Sofia', 'Lucas', 'Mia', 'Chen', 'Fatima', 'Diego', 'Anna', 'Kenji', 'Zara', 'Omar', 'Elena', 'Raj', 'Nina', 'Tom'];
const LAST_NAMES = ['Smith', 'Johnson', 'Kumar', 'Chen', 'Muller', 'Garcia', 'Silva', 'Tanaka', 'Nguyen', 'Patel', 'Brown', 'Wilson', 'Martin', 'Lee', 'Dubois', 'Rossi', 'Kim', 'Singh', 'Ali', 'Costa', 'Fischer', 'Lopez', 'Ivanov', 'Sato', 'Cohen', 'Murphy', 'Reyes', 'Novak', 'Haas', 'Bianchi'];
const GENDERS = ['female', 'male', 'other'];

async function seed() {
  const client = await pool.connect();
  try {
    // eslint-disable-next-line no-console
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // Reset (idempotent seed).
    await client.query('TRUNCATE salary_history, employees RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM currency_rates');
    await client.query('DELETE FROM users');

    // Currency rates.
    for (const r of RATES) {
      await client.query(
        'INSERT INTO currency_rates (currency, rate_to_usd, symbol) VALUES ($1,$2,$3)',
        [r.currency, r.rate_to_usd, r.symbol],
      );
    }

    // HR Manager user.
    const email = (process.env.ADMIN_EMAIL || 'hr.manager@acme.com').toLowerCase();
    const hash = await hashPassword(process.env.ADMIN_PASSWORD || 'Password123!');
    const userRes = await client.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,'hr_manager') RETURNING id",
      [email, hash, 'ACME HR Manager'],
    );
    const adminId = userRes.rows[0].id;

    // Employees + initial salary, inserted in batches for speed.
    const BATCH = 500;
    let empValues = [];
    let empParams = [];
    const empMeta = []; // keep salary metadata aligned with insertion order

    for (let i = 1; i <= TOTAL_EMPLOYEES; i += 1) {
      const loc = pick(COUNTRIES);
      const dept = pick(DEPARTMENTS);
      const lvl = pick(LEVELS);
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const gender = pick(GENDERS);
      const empNo = `ACME-${String(i).padStart(5, '0')}`;
      const mail = `${first}.${last}.${i}@acme.com`.toLowerCase();
      const title = pick(dept.titles);
      const status = rand() < 0.05 ? 'terminated' : 'active';
      const hireYear = randInt(2015, 2024);
      const hireDate = `${hireYear}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;

      // Salary: dept base * level mult * country mult * small jitter, in local currency minor units.
      const jitter = 0.9 + rand() * 0.2;
      const localMajor = dept.base * lvl.mult * loc.mult * jitter;
      const amountMinor = Math.round(localMajor * 100);

      const p = empParams.length;
      empValues.push(`($${p + 1},$${p + 2},$${p + 3},$${p + 4},$${p + 5},$${p + 6},$${p + 7},$${p + 8},$${p + 9},$${p + 10},$${p + 11},$${p + 12})`);
      empParams.push(empNo, first, last, mail, gender, dept.name, title, lvl.level, loc.country, loc.currency, status, hireDate);
      empMeta.push({ amountMinor, currency: loc.currency, hireDate });

      if (empValues.length === BATCH || i === TOTAL_EMPLOYEES) {
        const insertSql = `
          INSERT INTO employees
            (employee_no, first_name, last_name, email, gender, department, job_title, level, country, currency, status, hire_date)
          VALUES ${empValues.join(',')}
          RETURNING id`;
        const inserted = await client.query(insertSql, empParams);

        // Insert corresponding initial salary rows.
        const salValues = [];
        const salParams = [];
        inserted.rows.forEach((row, idx) => {
          const meta = empMeta[idx];
          const sp = salParams.length;
          salValues.push(`($${sp + 1},$${sp + 2},$${sp + 3},$${sp + 4},'initial',$${sp + 5})`);
          salParams.push(row.id, meta.amountMinor, meta.currency, meta.hireDate, adminId);
        });
        await client.query(
          `INSERT INTO salary_history (employee_id, amount_minor, currency, effective_from, reason, changed_by)
           VALUES ${salValues.join(',')}`,
          salParams,
        );

        empValues = []; empParams = []; empMeta.length = 0;
        if (i % 2000 === 0 || i === TOTAL_EMPLOYEES) {
          // eslint-disable-next-line no-console
          console.log(`  ...${i}/${TOTAL_EMPLOYEES} employees`);
        }
      }
    }

    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log(`✅ Seed complete: ${TOTAL_EMPLOYEES} employees.`);
    // eslint-disable-next-line no-console
    console.log(`   Login: ${email} / ${process.env.ADMIN_PASSWORD || 'Password123!'}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(closePool);

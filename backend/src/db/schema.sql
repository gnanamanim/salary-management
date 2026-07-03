-- Salary Management System — schema
-- Money is stored as integer minor units (cents) to avoid floating-point drift.

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'hr_manager',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reference table: FX rate of each currency to the base currency (USD).
CREATE TABLE IF NOT EXISTS currency_rates (
  currency     TEXT PRIMARY KEY,        -- ISO 4217, e.g. USD, EUR, GBP, INR
  rate_to_usd  NUMERIC(18,8) NOT NULL,  -- multiply local amount by this to get USD
  symbol       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id           SERIAL PRIMARY KEY,
  employee_no  TEXT NOT NULL UNIQUE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  gender       TEXT,                    -- 'female' | 'male' | 'other' (for pay-gap analytics)
  department   TEXT NOT NULL,
  job_title    TEXT NOT NULL,
  level        TEXT NOT NULL,           -- L1..L7
  country      TEXT NOT NULL,
  currency     TEXT NOT NULL REFERENCES currency_rates(currency),
  status       TEXT NOT NULL DEFAULT 'active', -- 'active' | 'terminated'
  hire_date    DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only salary history. The "current" salary is the row with effective_to IS NULL.
CREATE TABLE IF NOT EXISTS salary_history (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount_minor  BIGINT NOT NULL,        -- annual gross, in minor units of the employee's currency
  currency      TEXT NOT NULL REFERENCES currency_rates(currency),
  effective_from DATE NOT NULL,
  effective_to  DATE,                   -- NULL = current
  reason        TEXT,                   -- 'initial' | 'raise' | 'adjustment' | ...
  changed_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes tuned for the list/filter/aggregate workloads.
CREATE INDEX IF NOT EXISTS idx_emp_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_emp_country    ON employees(country);
CREATE INDEX IF NOT EXISTS idx_emp_level      ON employees(level);
CREATE INDEX IF NOT EXISTS idx_emp_status     ON employees(status);
CREATE INDEX IF NOT EXISTS idx_emp_name       ON employees(lower(last_name), lower(first_name));
CREATE INDEX IF NOT EXISTS idx_salary_emp     ON salary_history(employee_id);
-- Fast lookup of the current salary row per employee.
CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_current
  ON salary_history(employee_id) WHERE effective_to IS NULL;

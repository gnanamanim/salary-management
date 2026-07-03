import { query } from '../db/pool.js';

// All salary analytics are computed in USD (normalized) so cross-country numbers are comparable.
// The core USD expression, reused across queries:
const USD = 's.amount_minor * cr.rate_to_usd';

// Only consider active employees who have a current salary row.
const ACTIVE_JOIN = `
  FROM employees e
  JOIN currency_rates cr ON cr.currency = e.currency
  JOIN salary_history s ON s.employee_id = e.id AND s.effective_to IS NULL
  WHERE e.status = 'active'
`;

/** Org-wide summary cards: headcount, total spend, averages (USD minor units). */
export async function summary() {
  const sql = `
    SELECT
      COUNT(*)::int                                        AS headcount,
      COALESCE(SUM(${USD}), 0)::bigint                     AS total_spend_usd,
      COALESCE(ROUND(AVG(${USD})), 0)::bigint              AS avg_usd,
      COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${USD})), 0)::bigint AS median_usd,
      COALESCE(MIN(${USD}), 0)::bigint                     AS min_usd,
      COALESCE(MAX(${USD}), 0)::bigint                     AS max_usd
    ${ACTIVE_JOIN}
  `;
  const { rows } = await query(sql);
  return rows[0];
}

/** Aggregate by an arbitrary (whitelisted) dimension column. */
export async function byDimension(dimension) {
  const allowed = { department: 'e.department', country: 'e.country', level: 'e.level' };
  const col = allowed[dimension];
  if (!col) throw new Error(`Unsupported dimension: ${dimension}`);
  const sql = `
    SELECT
      ${col} AS key,
      COUNT(*)::int                          AS headcount,
      ROUND(AVG(${USD}))::bigint             AS avg_usd,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${USD}))::bigint AS median_usd,
      MIN(${USD})::bigint                     AS min_usd,
      MAX(${USD})::bigint                     AS max_usd,
      SUM(${USD})::bigint                     AS total_usd
    ${ACTIVE_JOIN}
    GROUP BY ${col}
    ORDER BY total_usd DESC
  `;
  const { rows } = await query(sql);
  return rows;
}

/** Salary distribution bands (USD major units) computed in-DB. */
export async function distributionBands() {
  const sql = `
    WITH usd AS (
      SELECT (${USD}) / 100.0 AS v ${ACTIVE_JOIN}
    )
    SELECT
      CASE
        WHEN v < 50000 THEN '< 50k'
        WHEN v < 100000 THEN '50k-100k'
        WHEN v < 150000 THEN '100k-150k'
        WHEN v < 200000 THEN '150k-200k'
        ELSE '200k+'
      END AS band,
      COUNT(*)::int AS count
    FROM usd
    GROUP BY band
  `;
  const { rows } = await query(sql);
  const order = ['< 50k', '50k-100k', '100k-150k', '150k-200k', '200k+'];
  return order.map((band) => ({ band, count: rows.find((r) => r.band === band)?.count || 0 }));
}

/** Top N earners in USD. */
export async function topEarners(n = 10) {
  const sql = `
    SELECT
      e.id, e.first_name, e.last_name, e.department, e.country, e.level,
      ROUND(${USD})::bigint AS salary_usd
    ${ACTIVE_JOIN}
    ORDER BY salary_usd DESC
    LIMIT $1
  `;
  const { rows } = await query(sql, [n]);
  return rows;
}

/** Gender pay-gap signal: average USD salary by gender. */
export async function payGapByGender() {
  const sql = `
    SELECT e.gender AS key, COUNT(*)::int AS headcount, ROUND(AVG(${USD}))::bigint AS avg_usd
    ${ACTIVE_JOIN}
    GROUP BY e.gender
    ORDER BY e.gender
  `;
  const { rows } = await query(sql);
  return rows;
}

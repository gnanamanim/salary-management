// Pure currency helpers. No DB, no HTTP — trivially unit-testable.
//
// Money is handled as integer *minor units* (cents) throughout the system.
// FX rates convert a local amount to USD: usd = local * rate_to_usd.

/**
 * Convert an amount in minor units of a currency to USD minor units (cents).
 * @param {number|bigint} amountMinor - amount in minor units of `currency`
 * @param {number} rateToUsd - multiplier to convert 1 major unit to USD
 * @returns {number} amount in USD cents, rounded to nearest cent
 */
export function toUsdMinor(amountMinor, rateToUsd) {
  if (rateToUsd == null || Number.isNaN(Number(rateToUsd))) {
    throw new Error('rateToUsd is required and must be a number');
  }
  const local = Number(amountMinor);
  if (Number.isNaN(local)) throw new Error('amountMinor must be a number');
  return Math.round(local * Number(rateToUsd));
}

/** Format minor units into a human string, e.g. 1234567 -> "12,345.67". */
export function formatMinor(amountMinor) {
  const n = Number(amountMinor) / 100;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert a major-unit amount (e.g. 95000.50) to minor units (9500050). */
export function toMinor(major) {
  const n = Number(major);
  if (Number.isNaN(n)) throw new Error('major must be a number');
  return Math.round(n * 100);
}

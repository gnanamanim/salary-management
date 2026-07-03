// Pure validation helpers for incoming request data. Throw ValidationError on bad input.

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
const STATUSES = ['active', 'terminated'];

/** Validate & normalize pagination params. Caps limit at 100 to protect the DB at 10k scale. */
export function parsePagination(queryObj = {}) {
  let page = parseInt(queryObj.page ?? '1', 10);
  let limit = parseInt(queryObj.limit ?? '25', 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 25;
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** Validate the body of a salary-change request. Returns the parsed amount in minor units. */
export function validateSalaryChange(body = {}) {
  const { amount, currency, reason } = body;
  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    throw new ValidationError('amount must be a positive number');
  }
  if (amt > 100_000_000) {
    throw new ValidationError('amount is unrealistically large');
  }
  if (!currency || typeof currency !== 'string' || currency.length !== 3) {
    throw new ValidationError('currency must be a 3-letter ISO code');
  }
  return {
    amountMinor: Math.round(amt * 100),
    currency: currency.toUpperCase(),
    reason: reason && String(reason).slice(0, 200),
  };
}

/** Whitelist a sort column to prevent SQL injection via ORDER BY. */
export function safeSortColumn(input, allowed, fallback) {
  return allowed.includes(input) ? input : fallback;
}

export function safeSortDir(input) {
  return String(input).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
}

export function isValidLevel(level) {
  return LEVELS.includes(level);
}

export function isValidStatus(status) {
  return STATUSES.includes(status);
}

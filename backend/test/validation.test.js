import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePagination, validateSalaryChange, safeSortColumn, safeSortDir,
  isValidLevel, isValidStatus, ValidationError,
} from '../src/services/validation.js';

test('parsePagination defaults', () => {
  const { page, limit, offset } = parsePagination({});
  assert.equal(page, 1);
  assert.equal(limit, 25);
  assert.equal(offset, 0);
});

test('parsePagination computes offset', () => {
  const { offset } = parsePagination({ page: '3', limit: '10' });
  assert.equal(offset, 20);
});

test('parsePagination caps limit at 100 (protects DB at scale)', () => {
  assert.equal(parsePagination({ limit: '5000' }).limit, 100);
});

test('parsePagination handles garbage input', () => {
  const { page, limit } = parsePagination({ page: 'abc', limit: '-5' });
  assert.equal(page, 1);
  assert.equal(limit, 25);
});

test('validateSalaryChange returns minor units', () => {
  const r = validateSalaryChange({ amount: 95000.5, currency: 'usd' });
  assert.equal(r.amountMinor, 9_500_050);
  assert.equal(r.currency, 'USD');
});

test('validateSalaryChange rejects non-positive amount', () => {
  assert.throws(() => validateSalaryChange({ amount: 0, currency: 'USD' }), ValidationError);
  assert.throws(() => validateSalaryChange({ amount: -100, currency: 'USD' }), ValidationError);
});

test('validateSalaryChange rejects bad currency', () => {
  assert.throws(() => validateSalaryChange({ amount: 100, currency: 'US' }), ValidationError);
  assert.throws(() => validateSalaryChange({ amount: 100 }), ValidationError);
});

test('validateSalaryChange rejects unrealistically large amount', () => {
  assert.throws(() => validateSalaryChange({ amount: 999_999_999, currency: 'USD' }), ValidationError);
});

test('safeSortColumn whitelists to prevent SQL injection', () => {
  const allowed = ['name', 'salary_usd'];
  assert.equal(safeSortColumn('salary_usd', allowed, 'name'), 'salary_usd');
  assert.equal(safeSortColumn('; DROP TABLE employees;', allowed, 'name'), 'name');
});

test('safeSortDir only allows ASC/DESC', () => {
  assert.equal(safeSortDir('desc'), 'DESC');
  assert.equal(safeSortDir('DESC'), 'DESC');
  assert.equal(safeSortDir('asc'), 'ASC');
  assert.equal(safeSortDir('nonsense'), 'ASC');
});

test('level and status validators', () => {
  assert.ok(isValidLevel('L3'));
  assert.ok(!isValidLevel('L99'));
  assert.ok(isValidStatus('active'));
  assert.ok(!isValidStatus('deleted'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toUsdMinor, toMinor, formatMinor } from '../src/services/currency.js';

test('toUsdMinor converts local minor units to USD cents', () => {
  // 100000 minor (=1000.00) EUR at 1.08 -> 108000 USD cents
  assert.equal(toUsdMinor(100_000, 1.08), 108_000);
});

test('toUsdMinor with rate 1.0 is identity', () => {
  assert.equal(toUsdMinor(9_500_050, 1.0), 9_500_050);
});

test('toUsdMinor rounds to nearest cent', () => {
  assert.equal(toUsdMinor(100, 0.0067), 1); // 0.67 -> 1
});

test('toUsdMinor throws on missing rate', () => {
  assert.throws(() => toUsdMinor(1000, undefined), /rateToUsd is required/);
});

test('toUsdMinor throws on non-numeric amount', () => {
  assert.throws(() => toUsdMinor('abc', 1.0), /amountMinor must be a number/);
});

test('toMinor converts major to minor units', () => {
  assert.equal(toMinor(95000.5), 9_500_050);
  assert.equal(toMinor(0), 0);
});

test('toMinor throws on non-numeric', () => {
  assert.throws(() => toMinor('x'), /major must be a number/);
});

test('formatMinor produces grouped decimal string', () => {
  assert.equal(formatMinor(1_234_567), '12,345.67');
  assert.equal(formatMinor(0), '0.00');
});

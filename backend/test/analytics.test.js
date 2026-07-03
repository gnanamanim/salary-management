import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mean, median, min, max, distribution, payGapPct } from '../src/services/analytics.js';

test('mean of numbers', () => {
  assert.equal(mean([10, 20, 30]), 20);
  assert.equal(mean([5]), 5);
});

test('mean of empty array is 0', () => {
  assert.equal(mean([]), 0);
});

test('median with odd count', () => {
  assert.equal(median([3, 1, 2]), 2);
});

test('median with even count interpolates', () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('median does not mutate input', () => {
  const input = [3, 1, 2];
  median(input);
  assert.deepEqual(input, [3, 1, 2]);
});

test('median of empty array is 0', () => {
  assert.equal(median([]), 0);
});

test('min and max', () => {
  assert.equal(min([4, 2, 9, 1]), 1);
  assert.equal(max([4, 2, 9, 1]), 9);
  assert.equal(min([]), 0);
  assert.equal(max([]), 0);
});

test('distribution buckets salaries into correct bands', () => {
  const values = [30_000, 75_000, 120_000, 180_000, 250_000, 49_999, 50_000];
  const bands = distribution(values);
  const byLabel = Object.fromEntries(bands.map((b) => [b.label, b.count]));
  assert.equal(byLabel['< 50k'], 2);      // 30k, 49_999
  assert.equal(byLabel['50k–100k'], 2);   // 75k, 50k (boundary is inclusive of lower)
  assert.equal(byLabel['100k–150k'], 1);  // 120k
  assert.equal(byLabel['150k–200k'], 1);  // 180k
  assert.equal(byLabel['200k+'], 1);      // 250k
});

test('distribution total count equals input length', () => {
  const values = Array.from({ length: 50 }, (_, i) => i * 5000);
  const bands = distribution(values);
  const total = bands.reduce((a, b) => a + b.count, 0);
  assert.equal(total, values.length);
});

test('payGapPct: positive when group B earns less', () => {
  assert.equal(payGapPct(100_000, 90_000), 10);
});

test('payGapPct: negative when group B earns more', () => {
  assert.equal(payGapPct(100_000, 110_000), -10);
});

test('payGapPct: null when reference mean is zero', () => {
  assert.equal(payGapPct(0, 50_000), null);
});

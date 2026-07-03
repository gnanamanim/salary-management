// Pure statistics used by the analytics dashboard. No DB dependency so these can be
// unit-tested exhaustively and are also reused to post-process SQL aggregates.

/** Arithmetic mean of an array of numbers. Returns 0 for empty input. */
export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Median of an array of numbers (linear interpolation for even counts).
 * Does not mutate the input. Returns 0 for empty input.
 */
export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function min(values) {
  return values.length ? Math.min(...values) : 0;
}

export function max(values) {
  return values.length ? Math.max(...values) : 0;
}

/**
 * Bucket salaries into fixed bands (USD major units) for a distribution chart.
 * @param {number[]} usdMajorValues salaries in USD (major units)
 * @returns {{label:string,min:number,max:number|null,count:number}[]}
 */
export function distribution(usdMajorValues) {
  const bands = [
    { label: '< 50k', min: 0, max: 50_000 },
    { label: '50k–100k', min: 50_000, max: 100_000 },
    { label: '100k–150k', min: 100_000, max: 150_000 },
    { label: '150k–200k', min: 150_000, max: 200_000 },
    { label: '200k+', min: 200_000, max: null },
  ].map((b) => ({ ...b, count: 0 }));

  for (const v of usdMajorValues) {
    const band = bands.find((b) => v >= b.min && (b.max === null || v < b.max));
    if (band) band.count += 1;
  }
  return bands;
}

/**
 * Pay-gap percentage between two group means: how much lower group B is vs group A.
 * Positive => group B is paid less than group A. Returns null if either group empty.
 */
export function payGapPct(meanA, meanB) {
  if (!meanA) return null;
  return Number((((meanA - meanB) / meanA) * 100).toFixed(2));
}

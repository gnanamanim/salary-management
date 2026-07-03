// Frontend formatting helpers. Money always arrives from the API as minor units (cents).

export function usd(minor) {
  if (minor == null) return '—';
  return (Number(minor) / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });
}

export function usdPrecise(minor) {
  if (minor == null) return '—';
  return (Number(minor) / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  });
}

export function local(minor, currency, symbol) {
  if (minor == null) return '—';
  const n = (Number(minor) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${symbol || ''}${n} ${currency}`;
}

export function compact(minor) {
  if (minor == null) return '—';
  return (Number(minor) / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
  });
}

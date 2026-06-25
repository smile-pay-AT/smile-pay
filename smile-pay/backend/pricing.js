// Demo FX rates relative to USD. In a real system this would call a live
// FX API (e.g. exchangerate.host, Open Exchange Rates) on a timer/cache.
// These are illustrative, fixed rates so the demo is deterministic.
export const FX_RATES_PER_USD = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 86.5,
  JPY: 156.0,
  AED: 3.67,
  SGD: 1.35
};

// Stripe expects amounts in the currency's smallest unit. Most currencies
// are 2-decimal (cents), but some (JPY, KRW...) have zero decimal places.
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);

export function convertUsd(amountUsd, currency) {
  const rate = FX_RATES_PER_USD[currency];
  if (!rate) throw new Error(`Unsupported currency: ${currency}`);
  return amountUsd * rate;
}

// Converts a USD decimal amount into the integer "smallest unit" Stripe needs.
export function toStripeAmount(amountUsd, currency) {
  const converted = convertUsd(amountUsd, currency);
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(converted);
  }
  return Math.round(converted * 100);
}

export function formatAmount(amountUsd, currency) {
  const converted = convertUsd(amountUsd, currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2
  }).format(converted);
}

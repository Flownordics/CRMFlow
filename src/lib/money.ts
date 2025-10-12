export function formatMoneyMinor(
  minor: number,
  currency = "DKK",
  locale = "da-DK",
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    return (minor / 100).toFixed(2) + " " + currency;
  }
}

export function toMinor(amount: number) {
  return Math.round(amount * 100);
}

export function fromMinor(minor: number, currency?: string, locale?: string): string | number {
  // If currency is provided, return formatted string
  if (currency) {
    return formatMoneyMinor(minor, currency, locale);
  }
  // Otherwise return number (for backwards compatibility with calculations)
  return minor / 100;
}

// Format number with thousand separator (no currency)
export function formatNumber(value: number, locale = "da-DK"): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

export function computeLineTotals(params: {
  qty: number;
  unitMinor: number;
  discountPct?: number;
  taxRatePct?: number;
}) {
  const qty = Number(params.qty) || 0;
  const unit = fromMinor(params.unitMinor || 0);
  const disc = (params.discountPct ?? 0) / 100;
  const taxR = (params.taxRatePct ?? 0) / 100;

  const gross = unit * qty; // ekskl. rabat
  const afterDisc = gross * (1 - disc); // efter rabat, ekskl. moms
  const tax = afterDisc * taxR; // moms i beløb
  const total = afterDisc + tax; // inkl. moms

  return {
    grossMinor: toMinor(gross),
    afterDiscMinor: toMinor(afterDisc),
    taxMinor: toMinor(tax),
    totalMinor: toMinor(total),
  };
}

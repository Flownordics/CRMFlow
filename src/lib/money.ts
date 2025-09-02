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

export function fromMinor(minor: number) {
  return minor / 100;
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

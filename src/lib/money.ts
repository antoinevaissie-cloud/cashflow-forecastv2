export function eurosToCents(value: number): number {
  return Math.round(value * 100);
}

export function poundsToCents(value: number): number {
  return Math.round(value * 100);
}

export function centsToCurrencyString(cents: number, currency: string = "EUR"): string {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  return formatter.format((cents ?? 0) / 100);
}

export function getGbpToEurRate(): number {
  const fromEnv = process.env.GBP_EUR_RATE;
  const parsed = fromEnv ? Number(fromEnv) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.17; // sensible default
}

export function convertGbpCentsToEurCents(gbpCents: number, rate: number): number {
  const gbp = (gbpCents ?? 0) / 100;
  return Math.round(gbp * rate * 100);
}

export function convertToEurCents(amountCents: number, currency: string): number {
  if ((currency || "EUR").toUpperCase() === "GBP") {
    return convertGbpCentsToEurCents(amountCents, getGbpToEurRate());
  }
  return amountCents ?? 0;
}

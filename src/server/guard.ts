const DOMAIN_TOKENS =
  /(?:\b(?:PM2\.?5|PM10|NO2|SO2|O3|CO2e?|N95|N99|24-?h(?:our)?s?|INR\s?500)\b|₹\s?500\b)/gi;

export function guardNumbers(
  text: string,
  allowed: readonly number[],
  allowedClock: readonly string[],
): boolean {
  let normalized = text;
  // 1. Normalize Devanagari digits to ASCII
  normalized = normalized.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));
  // 2. Strip whitelisted air-quality domain tokens
  normalized = normalized.replace(DOMAIN_TOKENS, ' ');
  // 3. Remove allowed clock times
  for (const clock of allowedClock) {
    normalized = normalized.split(clock).join(' ');
  }
  // 4. Verify every remaining number is within 0.5 of an allowlisted number
  const matches = normalized.match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.every((raw) => {
    const val = Number.parseFloat(raw);
    return allowed.some((allowedVal) => Math.abs(allowedVal - val) < 0.5);
  });
}

export function guardAnalyzeResponseFields(
  fields: {
    readonly headlineReason: string;
    readonly tradeoffs: readonly string[];
    readonly nextMove: string;
    readonly caveat: string;
  },
  allowed: readonly number[],
  allowedClock: readonly string[],
): boolean {
  const texts = [fields.headlineReason, ...fields.tradeoffs, fields.nextMove, fields.caveat];
  return texts.every((t) => guardNumbers(t, allowed, allowedClock));
}

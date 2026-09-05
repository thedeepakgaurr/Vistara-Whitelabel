/**
 * Best-effort normalization to E.164-ish Indian mobile format (91XXXXXXXXXX).
 * Returns null when the input clearly isn't a usable mobile number.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\D/g, '');

  if (cleaned.length === 10) {
    const prefix = parseInt(cleaned.slice(0, 2), 10);
    if (prefix >= 60 && prefix <= 99) return `91${cleaned}`;
    return null;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const prefix = parseInt(cleaned.slice(2, 4), 10);
    if (prefix >= 60 && prefix <= 99) return cleaned;
    return null;
  }

  // Other country codes: accept 11-15 digit numbers as-is.
  if (cleaned.length >= 11 && cleaned.length <= 15) return cleaned;

  return null;
}

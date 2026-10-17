/**
 * Normalizes phone numbers to standard E.164 format (+91XXXXXXXXXX for India).
 * Supports:
 * - 10 digits: Indian mobile number starting with 6, 7, 8, 9 (e.g. 9876543210) -> +919876543210
 * - 11 digits: Indian mobile with leading zero (e.g. 09876543210) -> +919876543210
 * - 12 digits: Country code 91 + 10 digits (e.g. 919876543210) -> +919876543210
 * - 13 characters: Plus + 91 + 10 digits (e.g. +919876543210) -> +919876543210
 * - Other international numbers: 11-15 digits -> +XXXXXXXXXXX
 *
 * Returns null when the input is invalid or not a recognized mobile format.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = String(raw).trim().replace(/\D/g, '');

  // 1. 10-digit Indian mobile number (e.g. 9876543210)
  if (cleaned.length === 10) {
    const firstDigit = parseInt(cleaned[0], 10);
    if (firstDigit >= 6 && firstDigit <= 9) return `+91${cleaned}`;
    return null;
  }

  // 2. 11-digit number with leading 0 (e.g. 09876543210)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    const firstDigit = parseInt(withoutZero[0], 10);
    if (firstDigit >= 6 && firstDigit <= 9) return `+91${withoutZero}`;
    return null;
  }

  // 3. 12-digit Indian number with country code 91 (e.g. 919876543210 or cleaned from +919876543210)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const firstMobileDigit = parseInt(cleaned[2], 10);
    if (firstMobileDigit >= 6 && firstMobileDigit <= 9) return `+${cleaned}`;
    return null;
  }

  // 4. Other international country codes (11 to 15 digits)
  if (cleaned.length >= 11 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }

  return null;
}

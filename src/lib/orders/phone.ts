/**
 * Normalize Pakistan delivery mobile numbers to +923XXXXXXXXX.
 * This checks the number's shape, NOT SIM ownership or live reachability.
 * An SMS/voice OTP integration is needed to prove a number is active.
 */
export function normalizePakistanMobile(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 25) return null;
  const compact = input.replace(/[\s()\-]/g, "");
  if (/^03\d{9}$/.test(compact)) return `+92${compact.slice(1)}`;
  if (/^\+923\d{9}$/.test(compact)) return compact;
  return null;
}

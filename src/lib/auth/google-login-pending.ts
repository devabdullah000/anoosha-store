/**
 * This non-sensitive marker only requests a one-time profile refresh after
 * a full-page Google OAuth redirect. It is NOT an authentication credential.
 */
const KEY = "anoosha:google-login-pending";

export function markGoogleSignInPending(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // OAuth still works; the navbar may show a guest until a protected visit.
  }
}

export function consumeGoogleSignInPending(): boolean {
  try {
    const present = window.sessionStorage.getItem(KEY) === "1";
    window.sessionStorage.removeItem(KEY);
    return present;
  } catch {
    return false;
  }
}

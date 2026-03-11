export const GM_ALLOWED_EMAIL = "luke@southwalescustomcomputers.com";

export function normaliseEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function isGmAllowedEmail(email: string | null | undefined) {
  return normaliseEmail(email) === GM_ALLOWED_EMAIL;
}
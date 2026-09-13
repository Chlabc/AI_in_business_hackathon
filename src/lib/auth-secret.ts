/** Shared HMAC secret for session JWTs - Edge + Node safe (no next/headers). */
export function authSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    "cornerman-demo-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

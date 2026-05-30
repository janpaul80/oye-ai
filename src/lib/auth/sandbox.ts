/**
 * Sandbox & Demo Environment Gatekeeping Utilities
 * Ensures mock logins, local bypasses, and fake datasets never leak into production.
 */

/**
 * Checks if the Sandbox Mode is explicitly enabled and allowed.
 * Hard-gated by environment constraints:
 * 1. Must NOT be in production environment (NODE_ENV !== 'production')
 * 2. NEXT_PUBLIC_ENABLE_SANDBOX_MODE must be set to 'true'
 */
export function isSandboxEnabled(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const isSandboxFlag = process.env.NEXT_PUBLIC_ENABLE_SANDBOX_MODE === 'true';
  return !isProd && isSandboxFlag;
}

/**
 * Helper to check if a mock sandbox cookie session is active.
 * Only validated if Sandbox Mode is allowed by environment configuration.
 */
export function hasSandboxSession(cookiesMap?: { get: (name: string) => { value: string } | undefined }): boolean {
  if (!isSandboxEnabled()) return false;

  // Server-side (using Request/Middleware cookies mapper)
  if (cookiesMap) {
    const mockCookie = cookiesMap.get('oye_mock_session');
    return mockCookie?.value === 'true';
  }

  // Client-side (using document.cookie)
  if (typeof document !== 'undefined') {
    return document.cookie.includes('oye_mock_session=true');
  }

  return false;
}

/**
 * Sets the sandbox session cookie.
 * Hard-gated to prevent accidental execution in production.
 */
export function enableSandboxSession(): boolean {
  if (!isSandboxEnabled()) {
    console.error('[Sandbox] Attempted to enable sandbox session in unauthorized environment.');
    return false;
  }
  document.cookie = 'oye_mock_session=true; path=/; max-age=3600; SameSite=Lax';
  console.warn('[Sandbox] Sandbox Mock Session enabled successfully.');
  return true;
}

/**
 * Clears the sandbox session cookie.
 */
export function disableSandboxSession(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'oye_mock_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

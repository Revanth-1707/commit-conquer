/**
 * packages/server/src/utils/oauthConfig.ts
 *
 * Validates OAuth environment variables at startup.
 * Missing config is surfaced loudly instead of silently falling back to
 * weaker auth flows, which can mask misconfigurations in production.
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export type OAuthValidationResult =
  | { valid: true; config: OAuthConfig }
  | { valid: false; missing: string[] };

const REQUIRED_OAUTH_ENV_VARS = [
  'OAUTH_CLIENT_ID',
  'OAUTH_CLIENT_SECRET',
  'OAUTH_CALLBACK_URL',
] as const;

/**
 * Reads OAuth env vars and returns a typed validation result.
 * Never throws — callers decide how to handle missing config.
 */
export function validateOAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): OAuthValidationResult {
  const missing = REQUIRED_OAUTH_ENV_VARS.filter(
    (key) => !env[key] || env[key]!.trim() === '',
  );

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return {
    valid: true,
    config: {
      clientId: env.OAUTH_CLIENT_ID!.trim(),
      clientSecret: env.OAUTH_CLIENT_SECRET!.trim(),
      callbackUrl: env.OAUTH_CALLBACK_URL!.trim(),
    },
  };
}

/**
 * Called once at application startup.
 * Logs a clear warning when OAuth env vars are absent so operators are never
 * silently surprised by a fallback auth path in production.
 *
 * Does NOT throw by default — the app can still start without OAuth if the
 * feature is intentionally disabled, but the missing vars are always logged.
 *
 * @param strict - When true, throws instead of warning (useful in production).
 */
export function assertOAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
  strict = env.NODE_ENV === 'production',
): OAuthConfig | null {
  const result = validateOAuthConfig(env);

  if (!result.valid) {
    const msg =
      `[OAuth] Missing required environment variable(s): ${result.missing.join(', ')}. ` +
      `OAuth authentication will be unavailable. ` +
      `Set these variables to enable OAuth login.`;

    if (strict) {
      throw new Error(msg);
    }

    console.warn(msg);
    return null;
  }

  return result.config;
}

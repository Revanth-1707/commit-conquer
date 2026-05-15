/**
 * packages/server/src/services/passwordResetService.ts
 *
 * Handles password-reset requests with two safety layers:
 *
 * 1. Per-key throttling (by IP and by email) — prevents reset-email flooding
 *    and brute-force attacks on the endpoint.
 *
 * 2. Idempotency tokens — a reset token is valid for exactly one redemption.
 *    Replaying the same token (e.g. from a stale XHR in another tab) returns
 *    a clear error instead of triggering a second reset and desynchronising
 *    session state.
 */

import { AppError } from '../middleware/errorHandler';
import { generateToken } from '../utils/crypto';

// ─── Throttle store ───────────────────────────────────────────────────────────

interface ThrottleEntry {
  count: number;
  windowStart: number;
}

const THROTTLE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_EMAIL = 3;
const MAX_ATTEMPTS_PER_IP = 10;

// Separate maps so an attacker can't probe multiple emails from one IP and
// exhaust only one counter.
const emailThrottleMap = new Map<string, ThrottleEntry>();
const ipThrottleMap = new Map<string, ThrottleEntry>();

function checkThrottle(
  map: Map<string, ThrottleEntry>,
  key: string,
  max: number,
): void {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now - entry.windowStart >= THROTTLE_WINDOW_MS) {
    // New window — reset counter
    map.set(key, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= max) {
    const retryAfterSec = Math.ceil(
      (THROTTLE_WINDOW_MS - (now - entry.windowStart)) / 1000,
    );
    throw new AppError(
      `Too many password-reset requests. Please try again in ${retryAfterSec} seconds.`,
      429,
    );
  }

  entry.count += 1;
}

// ─── Pending-token store ──────────────────────────────────────────────────────

interface PendingReset {
  userId: string;
  email: string;
  token: string;
  createdAt: number;
  used: boolean;
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const pendingResets = new Map<string, PendingReset>(); // keyed by token

// ─── Service ──────────────────────────────────────────────────────────────────

export class PasswordResetService {
  /**
   * Request a password reset for the given email.
   *
   * - Throttled per email (MAX_ATTEMPTS_PER_EMAIL) and per IP (MAX_ATTEMPTS_PER_IP)
   *   within THROTTLE_WINDOW_MS to prevent flooding.
   * - Generating a new reset while one is still pending invalidates the old one,
   *   so stale tokens from earlier tabs cannot be redeemed.
   *
   * Deliberately returns the same success shape whether or not the email exists
   * to avoid user-enumeration.
   */
  async requestReset(
    email: string,
    ip: string,
    getUserIdByEmail: (email: string) => Promise<string | null>,
  ): Promise<{ message: string }> {
    // ── Throttle checks (throw 429 before touching user data) ──────────────
    checkThrottle(emailThrottleMap, email.toLowerCase(), MAX_ATTEMPTS_PER_EMAIL);
    checkThrottle(ipThrottleMap, ip, MAX_ATTEMPTS_PER_IP);

    // ── Look up user — always respond generically ──────────────────────────
    const userId = await getUserIdByEmail(email);

    if (userId) {
      // Invalidate any existing pending reset for this user to prevent replay
      // from stale sessions in concurrent tabs.
      for (const [existingToken, reset] of pendingResets) {
        if (reset.userId === userId && !reset.used) {
          pendingResets.delete(existingToken);
        }
      }

      const token = generateToken(userId);
      pendingResets.set(token, {
        userId,
        email,
        token,
        createdAt: Date.now(),
        used: false,
      });

      // In a real implementation: send email here.
      // We surface the token in the response only in development so the
      // manual-testing workflow still works without an email server.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PasswordReset] token for ${email}: ${token}`);
      }
    }

    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  /**
   * Redeem a reset token and set a new password.
   *
   * Each token is single-use. Once redeemed (or expired) it is removed from
   * the pending store. Concurrent tabs sending the same token will receive a
   * clear 400 rather than silently replaying the reset.
   */
  async redeemReset(
    token: string,
    newPassword: string,
    applyNewPassword: (userId: string, newPassword: string) => Promise<void>,
  ): Promise<{ message: string }> {
    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    const reset = pendingResets.get(token);

    if (!reset) {
      throw new AppError(
        'Invalid or expired reset token. Please request a new one.',
        400,
      );
    }

    if (reset.used) {
      throw new AppError(
        'This reset token has already been used. Please request a new one.',
        400,
      );
    }

    if (Date.now() - reset.createdAt > TOKEN_TTL_MS) {
      pendingResets.delete(token);
      throw new AppError(
        'This reset token has expired. Please request a new one.',
        400,
      );
    }

    // Mark used immediately — prevents a race where two concurrent requests
    // both pass the above checks before either has written the new password.
    reset.used = true;
    pendingResets.delete(token);

    await applyNewPassword(reset.userId, newPassword);

    return { message: 'Password updated successfully.' };
  }

  /** Test helper — clears all in-memory state. */
  _reset(): void {
    pendingResets.clear();
    emailThrottleMap.clear();
    ipThrottleMap.clear();
  }
}
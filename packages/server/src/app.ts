/**
 * packages/server/src/app.ts
 */

import express, { Request, Response } from 'express';
import { UserService } from './services/userService';
import { CommitService } from './services/commitService';
import { LeaderboardService } from './services/leaderboardService';
import { PasswordResetService } from './services/passwordResetService';
import { UserController } from './controllers/userController';
import { CommitController } from './controllers/commitController';
import { authenticate } from './middleware/authenticate';
import { validateBody } from './middleware/validateBody';
import { errorHandler } from './middleware/errorHandler';
import { assertOAuthConfig } from './utils/oauthConfig';
import { requestMonitoring } from './utils/monitoring';
import rateLimit from 'express-rate-limit';

export function createApp() {
  const app = express();
  app.use(requestMonitoring);
  app.use(express.json());

  // ── OAuth environment validation ───────────────────────────────────────────
  // Surfaces missing OAuth config loudly at startup instead of silently falling
  // back to weaker auth flows. In production this throws; in dev it warns.
  assertOAuthConfig();

  // ── General API rate limiter ───────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/v1', apiLimiter);

  // ── Password-reset rate limiter (stricter than general limiter) ────────────
  // Applied only to the two reset endpoints so normal API traffic is unaffected.
  // The per-email / per-userId throttling inside PasswordResetService provides
  // a second layer of defence.
  const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // max 5 reset requests per IP per 15-minute window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many password-reset requests from this IP. Please try again later.',
    },
  });

  const userService          = new UserService();
  const commitService        = new CommitService();
  const leaderboardService   = new LeaderboardService();
  const passwordResetService = new PasswordResetService();

  const userController   = new UserController(userService);
  const commitController = new CommitController(commitService);

  // ── User routes ────────────────────────────────────────────────────────────
  app.get('/api/v1/users', (req, res, next) =>
    userController.list(req, res, next));

  app.get('/api/v1/users/:id', (req, res, next) =>
    userController.get(req, res, next));

  app.post('/api/v1/auth/register',
    validateBody(['username', 'email']),
    (req, res, next) => userController.register(req, res, next),
  );

  app.post('/api/v1/auth/login',
    validateBody(['email', 'password']),
    (req, res, next) => userController.login(req, res, next),
  );

  // ── Password reset routes ──────────────────────────────────────────────────
  // Both endpoints use the stricter rate limiter. The service layer adds a
  // further per-email throttle and idempotency check to prevent concurrent-tab
  // stale-hydration replays from flooding reset emails or desynchronising state.

  app.post('/api/v1/auth/password-reset/request',
    passwordResetLimiter,
    validateBody(['email']),
    async (req: Request, res: Response, next) => {
      try {
        const ip = (req.ip ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();
        const result = await passwordResetService.requestReset(
          req.body.email,
          ip,
          (email) => userService.getUserIdByEmail(email),
        );
        res.json({ success: true, ...result });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post('/api/v1/auth/password-reset/redeem',
    passwordResetLimiter,
    validateBody(['token', 'newPassword']),
    async (req: Request, res: Response, next) => {
      try {
        const result = await passwordResetService.redeemReset(
          req.body.token,
          req.body.newPassword,
          (userId, newPassword) => userService.resetPassword(userId, newPassword),
        );
        res.json({ success: true, ...result });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── Commit routes ──────────────────────────────────────────────────────────
  app.get('/api/v1/commits', (req, res, next) =>
    commitController.list(req, res, next));

  app.get('/api/v1/commits/:id', (req, res, next) =>
    commitController.get(req, res, next));

  app.post('/api/v1/commits',
    authenticate,
    validateBody(['message', 'repo']),
    (req, res, next) => commitController.create(req, res, next),
  );

  app.delete('/api/v1/commits/:id',
    authenticate,
    (req, res, next) => commitController.remove(req, res, next),
  );

  // ── Leaderboard routes ─────────────────────────────────────────────────────
  app.get('/api/v1/leaderboard', async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const data  = await leaderboardService.getLeaderboard(limit);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/v1/leaderboard/:userId', async (req, res, next) => {
    try {
      const data = await leaderboardService.getUserRank(req.params.userId);
      if (!data) {
        return res.status(404).json({ success: false, error: 'User not ranked' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Error handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

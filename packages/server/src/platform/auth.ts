import type { RequestHandler } from "express";
import { AuthService } from "../../../modules/auth/auth.service.ts";
import { err, handleErr } from "./http";

declare global {
  namespace Express {
    interface Request {
      customer?: ReturnType<typeof AuthService.validateToken>;
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json(err("UNAUTHORIZED", "Missing or malformed Authorization header"));
    return;
  }

  try {
    req.customer = AuthService.validateToken(header.slice(7));
    next();
  } catch (e) {
    handleErr(e, res);
  }
};

export const softAuthenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.customer = AuthService.validateToken(header.slice(7));
    } catch {
      // Optional auth should not block anonymous checkout/cart flows.
    }
  }
  next();
};

export const adminOnly: RequestHandler = (req, res, next) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET && process.env.NODE_ENV !== "development") {
    res.status(403).json(err("FORBIDDEN", "Admin access required"));
    return;
  }
  next();
};

import type { Response } from "express";
import { ServiceError } from "../../../modules/products/product.service.ts";

export function err(code: string, message: string) {
  return { error: { code, message } };
}

const STATUS_MAP: Record<string, number> = {
  PRODUCT_NOT_FOUND: 404,
  VARIANT_NOT_FOUND: 404,
  CART_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  CUSTOMER_NOT_FOUND: 404,
  ITEM_NOT_FOUND: 404,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INSUFFICIENT_STOCK: 409,
  EMAIL_EXISTS: 409,
  VALIDATION_ERROR: 422,
  WEAK_PASSWORD: 422,
  EMPTY_CART: 422,
  MISSING_EMAIL: 422,
  MISSING_ADDRESS: 422,
  UPDATE_FAILED: 500,
  DELETE_FAILED: 500,
  INTERNAL_ERROR: 500,
};

export function handleErr(e: unknown, res: Response) {
  if (e instanceof ServiceError) {
    const status = STATUS_MAP[e.code] ?? 400;
    res.status(status).json(err(e.code, e.message));
    return;
  }

  console.error("[Server] Unexpected error:", e);
  res.status(500).json(err("INTERNAL_ERROR", "An unexpected error occurred"));
}

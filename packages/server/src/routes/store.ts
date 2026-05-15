import express from "express";
import { ProductService } from "../../../modules/products/product.service.ts";
import { AuthService } from "../../../modules/auth/auth.service.ts";
import { CartService } from "../../../modules/cart/cart.service.ts";
import { OrderService } from "../../../modules/orders/order.service.ts";
import { PaymentService } from "../../../modules/payments/payment.service.ts";
import { InventoryService } from "../../../modules/inventory/inventory.service.ts";
import { ShippingService } from "../../../modules/shipping/shipping.service.ts";
import { authenticate, softAuthenticate } from "../platform/auth";
import { err, handleErr } from "../platform/http";

export function createStoreRouter() {
  const store = express.Router();

  store.get("/products", (req, res) => {
    try {
      const result = ProductService.list({
        offset: parseInt(String(req.query.offset ?? "0"), 10),
        limit: parseInt(String(req.query.limit ?? "12"), 10),
        status: (req.query.status as "published") ?? "published",
        category: req.query.category as string,
        search: req.query.search as string,
        sort: req.query.sort as "newest" | "price_asc" | "price_desc",
      });
      res.json(result);
    } catch (e) { handleErr(e, res); }
  });

  store.get("/products/handle/:handle", (req, res) => {
    try { res.json({ product: ProductService.getByHandle(req.params.handle) }); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/products/:id", (req, res) => {
    try { res.json({ product: ProductService.getById(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/categories", (_req, res) => {
    try { res.json({ categories: ProductService.categories() }); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/auth/register", async (req, res) => {
    try { res.status(201).json(await AuthService.register(req.body)); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/auth/login", async (req, res) => {
    try { res.json(await AuthService.login(req.body)); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/auth/logout", authenticate, async (req, res) => {
    try {
      await AuthService.logout(req.headers.authorization!.slice(7));
      res.json({ success: true });
    } catch (e) { handleErr(e, res); }
  });

  store.get("/auth/me", authenticate, (req, res) => res.json({ customer: req.customer }));

  store.patch("/auth/me", authenticate, async (req, res) => {
    try { res.json({ customer: await AuthService.updateProfile(req.customer!.id, req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/auth/reset-password/request", async (req, res) => {
    try { res.json(await AuthService.requestPasswordReset(req.body.email)); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/auth/reset-password/confirm", async (req, res) => {
    try {
      await AuthService.confirmPasswordReset(req.body.reset_token, req.body.new_password);
      res.json({ success: true });
    } catch (e) { handleErr(e, res); }
  });

  store.post("/auth/google", async (req, res) => {
    try { res.json(await AuthService.googleLogin(req.body.credential)); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/carts", softAuthenticate, async (req, res) => {
    try { res.status(201).json({ cart: await CartService.create(req.body.email ?? req.customer?.email) }); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/carts/:id", (req, res) => {
    try { res.json({ cart: CartService.get(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/carts/:id/items", async (req, res) => {
    try {
      const { product_id, variant_id, quantity = 1 } = req.body;
      res.json({ cart: await CartService.addItem(req.params.id, product_id, variant_id, quantity) });
    } catch (e) { handleErr(e, res); }
  });

  store.delete("/carts/:id/items/:lineId", async (req, res) => {
    try { res.json({ cart: await CartService.removeItem(req.params.id, req.params.lineId) }); }
    catch (e) { handleErr(e, res); }
  });

  store.patch("/carts/:id/items/:lineId", async (req, res) => {
    try { res.json({ cart: await CartService.updateQuantity(req.params.id, req.params.lineId, req.body.quantity) }); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/carts/:id/discount", async (req, res) => {
    try { res.json({ cart: await CartService.applyDiscount(req.params.id, req.body.code) }); }
    catch (e) { handleErr(e, res); }
  });

  store.delete("/carts/:id/discount", async (req, res) => {
    try { res.json({ cart: await CartService.removeDiscount(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  store.patch("/carts/:id/email", async (req, res) => {
    try { res.json({ cart: await CartService.setEmail(req.params.id, req.body.email) }); }
    catch (e) { handleErr(e, res); }
  });

  store.patch("/carts/:id/shipping-address", async (req, res) => {
    try { res.json({ cart: await CartService.setShippingAddress(req.params.id, req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  store.patch("/carts/:id/billing-address", async (req, res) => {
    try { res.json({ cart: await CartService.setBillingAddress(req.params.id, req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/carts/:id/summary", (req, res) => {
    try { res.json(CartService.summary(req.params.id)); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/shipping-options", async (_req, res) => {
    try { res.json({ shipping_options: await ShippingService.listOptions() }); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/orders", softAuthenticate, async (req, res) => {
    try { res.status(201).json({ order: await OrderService.place(req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/orders/:id", authenticate, (req, res) => {
    try {
      const order = OrderService.getById(String(req.params.id));
      if (order.customer_id && order.customer_id !== req.customer!.id) {
        res.status(403).json(err("FORBIDDEN", "Access denied"));
        return;
      }
      res.json({ order });
    } catch (e) { handleErr(e, res); }
  });

  store.get("/customers/me/orders", authenticate, (req, res) => {
    try { res.json(OrderService.list({ customer_id: req.customer!.id })); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/payment/initiate", async (req, res) => {
    try { res.status(201).json({ payment_session: await PaymentService.initiate(req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  store.post("/payment/capture", async (req, res) => {
    try { res.json({ payment_session: await PaymentService.capture(req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  store.get("/inventory/:variantId", (req, res) => {
    try { res.json({ inventory: InventoryService.getByVariant(req.params.variantId) }); }
    catch (e) { handleErr(e, res); }
  });

  return store;
}

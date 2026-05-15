import express from "express";
import { ProductService } from "../../../modules/products/product.service.ts";
import { AuthService } from "../../../modules/auth/auth.service.ts";
import { OrderService } from "../../../modules/orders/order.service.ts";
import { InventoryService } from "../../../modules/inventory/inventory.service.ts";
import { DiscountService } from "../../../modules/discounts/discount.service.ts";
import { ShippingService } from "../../../modules/shipping/shipping.service.ts";
import { adminOnly } from "../platform/auth";
import { handleErr } from "../platform/http";

export function createAdminRouter() {
  const admin = express.Router();
  admin.use(adminOnly);

  admin.get("/stats", (_req, res) => {
    try { res.json({ products: ProductService.stats(), orders: OrderService.stats() }); }
    catch (e) { handleErr(e, res); }
  });

  admin.get("/products", (req, res) => {
    try {
      res.json(ProductService.list({
        offset: parseInt(String(req.query.offset ?? "0"), 10),
        limit: parseInt(String(req.query.limit ?? "12"), 10),
        status: (req.query.status as "all") ?? "all",
        category: req.query.category as string,
        search: req.query.search as string,
        sort: req.query.sort as "newest",
      }));
    } catch (e) { handleErr(e, res); }
  });

  admin.get("/products/:id", (req, res) => {
    try { res.json({ product: ProductService.getById(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/products", async (req, res) => {
    try { res.status(201).json({ product: await ProductService.create(req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.patch("/products/:id", async (req, res) => {
    try { res.json({ product: await ProductService.update(req.params.id, req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.delete("/products/:id", async (req, res) => {
    try { res.json(await ProductService.delete(req.params.id)); }
    catch (e) { handleErr(e, res); }
  });

  admin.delete("/products", async (req, res) => {
    try { res.json(await ProductService.bulkDelete(req.body.ids)); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/products/:id/publish", async (req, res) => {
    try { res.json({ product: await ProductService.publish(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/products/:id/unpublish", async (req, res) => {
    try { res.json({ product: await ProductService.unpublish(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.patch("/products/:id/inventory", async (req, res) => {
    try {
      const { variant_id, delta } = req.body;
      await ProductService.adjustInventory(req.params.id, variant_id, delta);
      res.json({ success: true });
    } catch (e) { handleErr(e, res); }
  });

  admin.get("/orders", (req, res) => {
    try {
      res.json(OrderService.list({
        offset: parseInt(String(req.query.offset ?? "0"), 10),
        limit: parseInt(String(req.query.limit ?? "20"), 10),
        status: req.query.status as "all",
        search: req.query.search as string,
        sort: req.query.sort as "newest",
      }));
    } catch (e) { handleErr(e, res); }
  });

  admin.get("/orders/:id", (req, res) => {
    try { res.json({ order: OrderService.getById(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/orders/:id/fulfill", async (req, res) => {
    try { res.json({ order: await OrderService.fulfill(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/orders/:id/cancel", async (req, res) => {
    try { res.json({ order: await OrderService.cancel(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/orders/:id/refund", async (req, res) => {
    try {
      res.json({ order: await OrderService.refund({
        order_id: req.params.id,
        amount: req.body.amount,
        reason: req.body.reason,
      }) });
    } catch (e) { handleErr(e, res); }
  });

  admin.get("/customers/:id", (req, res) => {
    try { res.json({ customer: AuthService.getById(req.params.id) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.get("/discounts", async (_req, res) => {
    try { res.json({ discounts: await DiscountService.list() }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/discounts", async (req, res) => {
    try { res.status(201).json({ discount: await DiscountService.create(req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.delete("/discounts/:id", async (req, res) => {
    try {
      await DiscountService.delete(req.params.id);
      res.json({ deleted: req.params.id });
    } catch (e) { handleErr(e, res); }
  });

  admin.get("/inventory", async (_req, res) => {
    try { res.json({ inventory: await InventoryService.listAll() }); }
    catch (e) { handleErr(e, res); }
  });

  admin.patch("/inventory/:variantId", async (req, res) => {
    try { res.json({ inventory: await InventoryService.setStock(req.params.variantId, req.body.stocked_quantity) }); }
    catch (e) { handleErr(e, res); }
  });

  admin.get("/shipping-options", async (_req, res) => {
    try { res.json({ shipping_options: await ShippingService.listOptions() }); }
    catch (e) { handleErr(e, res); }
  });

  admin.post("/shipping-options", async (req, res) => {
    try { res.status(201).json({ shipping_option: await ShippingService.createOption(req.body) }); }
    catch (e) { handleErr(e, res); }
  });

  return admin;
}

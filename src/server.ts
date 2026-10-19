import express from "express";
import cors from "cors";
import { calculatePrice } from "./pricing";
import type { Product } from "./types";

export const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false;
  if (typeof value.sku !== "string" || typeof value.name !== "string") return false;
  if (![value.myPrice, value.minPrice, value.maxPrice, value.step].every(isNumber)) return false;
  if ((value.minPrice as number) > (value.maxPrice as number)) return false;
  if (!Number.isInteger(value.minPrice) || !Number.isInteger(value.maxPrice)) return false;
  if (!Array.isArray(value.competitors)) return false;
  return value.competitors.every((competitor: unknown) =>
    isRecord(competitor) && typeof competitor.seller === "string" &&
    isNumber(competitor.price) && typeof competitor.inStock === "boolean"
  );
}

app.post("/reprice", (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: "Request body must be an array of products" });
    return;
  }
  if (!req.body.every(isProduct)) {
    res.status(400).json({ error: "Invalid product data" });
    return;
  }
  res.json(req.body.map(calculatePrice));
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

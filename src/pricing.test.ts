import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing";
import type { Product } from "./types";
import products from "../data/products.json";
import expected from "../data/expected.json";

const base: Product = {
  sku: "SKU-1", name: "Test", myPrice: 999, minPrice: 100,
  maxPrice: 500, step: 10, competitors: [{ seller: "A", price: 300, inStock: true }],
};
const price = (overrides: Partial<Product> = {}) => calculatePrice({ ...base, ...overrides });

describe("calculatePrice", () => {
  it("matches all six reference fixtures", () => {
    expect((products as Product[]).map(calculatePrice)).toEqual(expected);
  });
  it("undercuts the cheapest available competitor", () => {
    expect(price({ competitors: [
      { seller: "A", price: 250, inStock: true },
      { seller: "B", price: 200, inStock: false },
      { seller: "C", price: 240, inStock: true },
    ] })).toEqual({ sku: "SKU-1", oldPrice: 999, newPrice: 230, reason: "UNDERCUT" });
  });
  it("clamps below minimum", () => {
    expect(price({ competitors: [{ seller: "A", price: 100, inStock: true }] }).reason).toBe("AT_MIN");
  });
  it("clamps above maximum", () => {
    expect(price({ competitors: [{ seller: "A", price: 999, inStock: true }] })).toMatchObject({ newPrice: 500, reason: "AT_MAX" });
  });
  it("uses max when no competitors are in stock", () => {
    expect(price({ competitors: [{ seller: "A", price: 1, inStock: false }] })).toMatchObject({ newPrice: 500, reason: "NO_COMPETITORS" });
    expect(price({ competitors: [] }).reason).toBe("NO_COMPETITORS");
  });
  it("floors fractional steps", () => {
    expect(price({ step: 0.5, competitors: [{ seller: "A", price: 349.9, inStock: true }] }).newPrice).toBe(349);
  });
  it("includes boundaries as UNDERCUT", () => {
    expect(price({ competitors: [{ seller: "A", price: 110, inStock: true }] }).reason).toBe("UNDERCUT");
    expect(price({ competitors: [{ seller: "A", price: 510, inStock: true }] }).reason).toBe("UNDERCUT");
  });
  it("does not mutate the input", () => {
    const input = structuredClone(base);
    price();
    expect(base).toEqual(input);
  });
  it("does not use myPrice for calculation", () => {
    expect(price({ myPrice: 0 }).newPrice).toBe(price({ myPrice: 10000 }).newPrice);
  });
});

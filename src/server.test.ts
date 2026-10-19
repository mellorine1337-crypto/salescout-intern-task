import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./server";
import products from "../data/products.json";
import expected from "../data/expected.json";

describe("POST /reprice", () => {
  it("returns prices in the same order", async () => {
    const res = await request(app).post("/reprice").send(products);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expected);
  });
  it("accepts an empty array", async () => {
    const res = await request(app).post("/reprice").send([]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
  it("rejects non-array input", async () => {
    const res = await request(app).post("/reprice").send({ hello: true });
    expect(res.status).toBe(400);
  });
  it("rejects invalid products", async () => {
    const res = await request(app).post("/reprice").send([{ sku: "oops" }]);
    expect(res.status).toBe(400);
  });
});

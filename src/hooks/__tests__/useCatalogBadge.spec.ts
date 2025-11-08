import { describe, it, expect } from "vitest";
import { useCatalogBadge } from "../useCatalogBadge";

describe("useCatalogBadge hook (smoke)", () => {
  it("exports a hook function", () => {
    expect(typeof useCatalogBadge).toBe("function");
  });
});

import { describe, it, expect } from "vitest";
import { mapApiValidationDetails } from "../TemplateFormModal";
import type { ValidationErrors } from "@/types";

describe("mapApiValidationDetails", () => {
  it("maps API validation details array to ValidationErrors object", () => {
    const details = [
      { field: "name", message: "Name is required" },
      { field: "rules", message: "At least one rule is required" },
    ];

    const result: ValidationErrors = mapApiValidationDetails(details) as ValidationErrors;
    expect(result).toHaveProperty("name", "Name is required");
    expect(result).toHaveProperty("rules", "At least one rule is required");
  });

  it("handles unknown fields gracefully by assigning them as keys", () => {
    const details = [{ field: "unknown_field", message: "Some error" }];
    const result = mapApiValidationDetails(details) as Record<string, string>;
    expect(result["unknown_field"]).toBe("Some error");
  });
});

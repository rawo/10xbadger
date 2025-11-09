// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TemplateFormModal } from "../TemplateFormModal";

describe("TemplateFormModal integration", () => {
  it("displays server-side validation errors returned from onSubmit", async () => {
    const template = {
      id: "t1",
      name: "Existing Template",
      path: "technical",
      from_level: "J1",
      to_level: "J2",
      rules: [{ category: "technical", level: "gold", count: 1 }],
      is_active: true,
    } as any;

    const onClose = vi.fn();

    const onSubmit = vi.fn().mockImplementation(async () => {
      const err: any = new Error("Validation failed");
      err.details = [{ field: "name", message: "Name is required" }];
      throw err;
    });

    render(
      <TemplateFormModal isOpen={true} mode="edit" template={template} onClose={onClose} onSubmit={onSubmit} />
    );

    // Ensure Save Changes button is present
    const submitButton = screen.getByRole("button", { name: /save changes/i });
    expect(submitButton).toBeTruthy();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      // The validation message should be rendered inline in the modal
      expect(screen.getByText("Name is required")).toBeTruthy();
    });
  });
});



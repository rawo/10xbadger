import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Remove dark class from document
    document.documentElement.classList.remove("dark");
  });

  it("should render the toggle button", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-label");
    });
  });

  it("should start with light mode by default", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    });
  });

  it("should toggle to dark mode when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to dark mode");
    });

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      // Check localStorage
      expect(localStorage.getItem("theme")).toBe("dark");
      // Check DOM class
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      // Check button label
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    });
  });

  it("should toggle back to light mode when clicked again", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to dark mode");
    });

    const button = screen.getByRole("button");

    // Toggle to dark
    await user.click(button);
    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    // Toggle back to light
    await user.click(button);
    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    });
  });

  it("should read initial theme from localStorage", async () => {
    // Set dark mode in localStorage
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    });
  });

  it("should persist theme preference across re-renders", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeToggle />);

    // Wait for mount and toggle to dark
    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to dark mode");
    });

    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    // Unmount and remount
    unmount();
    render(<ThemeToggle />);

    // Should remember dark mode
    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    });
  });
});

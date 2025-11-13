import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage and DOM on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = savedTheme || (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setTheme(initialTheme);
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";

    // Update state
    setTheme(newTheme);

    // Update localStorage
    localStorage.setItem("theme", newTheme);

    // Update DOM
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9" aria-label="Toggle theme" disabled>
        <Sun className="size-5" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="size-9"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="size-5 transition-all" aria-hidden="true" />
      ) : (
        <Sun className="size-5 transition-all" aria-hidden="true" />
      )}
      <span className="sr-only">{theme === "light" ? "Switch to dark mode" : "Switch to light mode"}</span>
    </Button>
  );
}

import { useState } from "react";
import { User, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  user: {
    display_name: string;
    email: string;
    is_admin: boolean;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get initials from display name
  const initials = user.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative size-9 rounded-full"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-medium">
          {initials}
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Content */}
          <div
            className="bg-card border-border absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border shadow-lg"
            role="menu"
            aria-orientation="vertical"
          >
            {/* User Info Section */}
            <div className="border-border border-b px-4 py-3">
              <p className="text-foreground truncate font-medium text-sm">{user.display_name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <a
                href="/"
                className="hover:bg-accent flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <User className="size-4" aria-hidden="true" />
                <span>Dashboard</span>
              </a>

              {/* Settings (Future) */}
              <button
                className="text-muted-foreground hover:bg-accent flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                role="menuitem"
                disabled
                title="Coming soon"
              >
                <Settings className="size-4" aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>

            {/* Admin Section */}
            {user.is_admin && (
              <>
                <div className="border-border border-t" />
                <div className="py-1">
                  <a
                    href="/admin/review"
                    className="hover:bg-accent flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                  >
                    <Shield className="size-4" aria-hidden="true" />
                    <span>Admin Review</span>
                  </a>
                </div>
              </>
            )}

            {/* Sign Out */}
            <div className="border-border border-t" />
            <div className="py-1">
              <a
                href="/logout"
                className="text-destructive hover:bg-destructive/10 flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span>Sign Out</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


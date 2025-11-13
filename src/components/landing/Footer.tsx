/**
 * Footer Component
 *
 * Landing page footer with navigation links, social media,
 * and company information.
 */

import { Github, Mail, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Section */}
          <div className="col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <img src="/logo.svg" alt="10xBadger Logo" className="h-10 w-10" />
              <span className="text-xl font-bold text-foreground">10xBadger</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering professionals to track achievements and advance their careers with confidence.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="/catalog" className="text-muted-foreground transition-colors hover:text-foreground">
                  Badge Catalog
                </a>
              </li>
              <li>
                <a
                  href="/promotion-templates"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Templates
                </a>
              </li>
              <li>
                <a href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                  Sign In
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#about" className="text-muted-foreground transition-colors hover:text-foreground">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-muted-foreground transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-muted-foreground transition-colors hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-muted-foreground transition-colors hover:text-foreground">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Connect Section */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Connect</h3>
            <p className="mb-4 text-sm text-muted-foreground">Stay updated with the latest features and news.</p>
            <div className="flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="mailto:contact@10xbadger.com"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>&copy; {currentYear} 10xBadger. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#privacy" className="transition-colors hover:text-foreground">
                Privacy
              </a>
              <a href="#terms" className="transition-colors hover:text-foreground">
                Terms
              </a>
              <a href="#cookies" className="transition-colors hover:text-foreground">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

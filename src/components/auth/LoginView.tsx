import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert, AuthSuccessMessage } from "./AuthErrorAlert";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginViewProps {
  error?: string;
  message?: string;
  redirectUrl?: string;
}

export function LoginView({ error, message, redirectUrl }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation
    if (!email || !password) {
      setValidationError("Please enter both email and password");
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    // Form submission will be handled by native form action in the future
    // For now, this is just UI - backend integration comes later
    const form = e.target as HTMLFormElement;
    form.submit();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and App Name */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-20 items-center justify-center">
            <img src="/logo.svg" alt="10xBadger Logo" className="h-20 w-20" />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
              10xBadger
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">Badge and Promotion Management</p>
        </div>

        {/* Login Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Message from URL params */}
            {error && <AuthErrorAlert error={error} />}

            {/* Success Message from URL params */}
            {message && <AuthSuccessMessage message={message} />}

            {/* Validation Error */}
            {validationError && (
              <div
                role="alert"
                aria-live="assertive"
                className="bg-destructive/10 border-destructive/50 text-destructive rounded-lg border p-3 text-sm"
              >
                {validationError}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} method="POST" action="/api/auth/login" className="space-y-4">
              {/* Hidden redirect field */}
              <input type="hidden" name="redirect" value={redirectUrl || "/"} />

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                  aria-describedby={validationError ? "form-error" : undefined}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                    aria-describedby={validationError ? "form-error" : undefined}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-r-md"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Registration Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don&apos;t have an account? </span>
              <a
                href="/register"
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                Register
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

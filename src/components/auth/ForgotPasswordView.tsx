import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert, AuthSuccessMessage } from "./AuthErrorAlert";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

interface ForgotPasswordViewProps {
  error?: string;
  success?: boolean;
}

export function ForgotPasswordView({ error, success }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sent] = useState(success || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation
    if (!email) {
      setValidationError("Please enter your email address");
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and App Name */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg
              className="size-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">10xbadger</h1>
          <p className="text-muted-foreground text-sm">Badge and Promotion Management</p>
        </div>

        {/* Forgot Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              {sent
                ? "Check your email for a password reset link"
                : "Enter your email address and we'll send you a link to reset your password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Message from URL params */}
            {error && <AuthErrorAlert error={error} />}

            {/* Success State */}
            {sent ? (
              <div className="space-y-4">
                <AuthSuccessMessage message="password_reset_sent" />

                <div className="bg-primary/5 border-primary/20 rounded-lg border p-4 text-sm space-y-2">
                  <div className="flex items-start gap-3">
                    <Mail className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Check your email</p>
                      <p className="text-muted-foreground">
                        We&apos;ve sent a password reset link to <strong className="text-foreground">{email}</strong>
                      </p>
                      <p className="text-muted-foreground">The link will expire in 1 hour.</p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button variant="outline" asChild className="w-full">
                    <a href="/login">
                      <ArrowLeft className="mr-2 size-4" />
                      Back to Sign In
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <>
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

                {/* Forgot Password Form */}
                <form onSubmit={handleSubmit} method="POST" action="/api/auth/forgot-password" className="space-y-4">
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

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  {/* Back to Login Link */}
                  <div className="text-center">
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/login">
                        <ArrowLeft className="mr-2 size-4" />
                        Back to Sign In
                      </a>
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs">
          If you don&apos;t receive an email, check your spam folder or try again.
        </p>
      </div>
    </div>
  );
}

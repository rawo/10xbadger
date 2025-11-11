import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthSuccessMessage } from "./AuthErrorAlert";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

interface VerifyEmailViewProps {
  email?: string;
}

export function VerifyEmailView({ email }: VerifyEmailViewProps) {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setIsResending(true);

    // Form submission will be handled by backend in the future
    // For now, just show success state after a delay to simulate API call
    setTimeout(() => {
      setIsResending(false);
      setResent(true);
    }, 1500);
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

        {/* Verify Email Card */}
        <Card>
          <CardHeader>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>We&apos;ve sent you a verification link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Message */}
            {resent && <AuthSuccessMessage message="registration_success" />}

            {/* Instructions */}
            <div className="bg-primary/5 border-primary/20 rounded-lg border p-4 text-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="size-5 text-primary" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="font-medium text-foreground">Verification email sent</p>
                  {email && (
                    <p className="text-muted-foreground">
                      We sent a verification link to <strong className="text-foreground">{email}</strong>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Click the link in the email to verify your account and complete your registration.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Instructions */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Didn&apos;t receive the email?</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            {/* Resend Button */}
            <Button onClick={handleResend} variant="outline" className="w-full" disabled={isResending || resent}>
              {isResending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : resent ? (
                "Verification email sent!"
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            {/* Back to Login */}
            <div className="text-center">
              <Button variant="ghost" size="sm" asChild>
                <a href="/login">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Sign In
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs">
          After verifying your email, you can sign in to your account.
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface ResetPasswordViewProps {
  token: string;
  error?: string;
}

export function ResetPasswordView({ token, error }: ResetPasswordViewProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength (0-4)
  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    setPasswordStrength(calculatePasswordStrength(pwd));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation
    if (!password || !confirmPassword) {
      setValidationError("Please fill in both password fields");
      return;
    }

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    // Form submission will be handled by native form action in the future
    // For now, this is just UI - backend integration comes later
    const form = e.target as HTMLFormElement;
    form.submit();
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-200";
    if (passwordStrength === 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-orange-500";
    if (passwordStrength === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength === 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
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

        {/* Reset Password Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Message from URL params */}
            {error && <AuthErrorAlert error={error} />}

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

            {/* Reset Password Form */}
            <form onSubmit={handleSubmit} method="POST" action="/api/auth/reset-password" className="space-y-4">
              {/* Hidden token field */}
              <input type="hidden" name="token" value={token} />

              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="new-password"
                    aria-describedby={validationError ? "form-error" : "password-strength"}
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

                {/* Password Strength Indicator */}
                {password && (
                  <div id="password-strength" className="space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            level <= passwordStrength ? getPasswordStrengthColor() : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    {passwordStrength > 0 && (
                      <p className="text-xs text-muted-foreground">{getPasswordStrengthText()} password</p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="new-password"
                    aria-describedby={validationError ? "form-error" : undefined}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-r-md"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            {/* Help Text */}
            <p className="text-muted-foreground text-center text-xs">
              After resetting your password, you&apos;ll be redirected to sign in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

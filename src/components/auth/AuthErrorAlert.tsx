import { AlertCircle } from "lucide-react";

interface AuthErrorAlertProps {
  error: string;
}

const errorMessages: Record<string, { title: string; message: string }> = {
  invalid_credentials: {
    title: "Invalid Credentials",
    message: "Invalid email or password. Please try again.",
  },
  email_already_exists: {
    title: "Email Already Registered",
    message: "An account with this email already exists. Please sign in.",
  },
  weak_password: {
    title: "Weak Password",
    message: "Password must be at least 8 characters long.",
  },
  passwords_dont_match: {
    title: "Passwords Don't Match",
    message: "Passwords do not match. Please try again.",
  },
  invalid_token: {
    title: "Invalid Reset Link",
    message: "This reset link is invalid or has expired. Please request a new one.",
  },
  email_not_confirmed: {
    title: "Email Not Verified",
    message: "Please verify your email address before signing in. Check your inbox.",
  },
  session_expired: {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again to continue.",
  },
  user_not_found: {
    title: "Account Not Found",
    message: "No account found with this email address.",
  },
  server_error: {
    title: "Server Error",
    message: "An unexpected error occurred. Please try again later.",
  },
};

export function AuthErrorAlert({ error }: AuthErrorAlertProps) {
  const errorInfo = errorMessages[error] || {
    title: "Error",
    message: "An error occurred during authentication. Please try again.",
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-destructive/10 border-destructive/50 text-destructive rounded-lg border p-4"
    >
      <div className="flex gap-3">
        <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-sm">{errorInfo.title}</h3>
          <p className="text-sm opacity-90">{errorInfo.message}</p>
        </div>
      </div>
    </div>
  );
}

interface AuthSuccessMessageProps {
  message: string;
}

const successMessages: Record<string, { title: string; message: string }> = {
  logged_out: {
    title: "Signed Out",
    message: "You have been successfully signed out.",
  },
  email_verified: {
    title: "Email Verified",
    message: "Email verified successfully. You can now sign in.",
  },
  password_reset_success: {
    title: "Password Reset",
    message: "Password reset successfully. You can now sign in with your new password.",
  },
  password_reset_sent: {
    title: "Check Your Email",
    message: "Check your email for a password reset link.",
  },
  registration_success: {
    title: "Account Created",
    message: "Account created successfully. Please check your email to verify your account.",
  },
};

export function AuthSuccessMessage({ message }: AuthSuccessMessageProps) {
  const messageInfo = successMessages[message] || {
    title: "Success",
    message: message,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-primary/10 border-primary/50 text-primary rounded-lg border p-4"
    >
      <div className="flex gap-3">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-sm">{messageInfo.title}</h3>
          <p className="text-sm opacity-90">{messageInfo.message}</p>
        </div>
      </div>
    </div>
  );
}

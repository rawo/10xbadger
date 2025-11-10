import { AlertCircle, XCircle } from "lucide-react";

interface AuthErrorAlertProps {
  error: string;
}

const errorMessages: Record<string, { title: string; message: string }> = {
  invalid_domain: {
    title: "Access Denied",
    message: "Your email domain is not authorized to access this application. Please contact your administrator.",
  },
  auth_failed: {
    title: "Authentication Failed",
    message: "Authentication failed. Please try again or contact support if the problem persists.",
  },
  session_expired: {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again to continue.",
  },
  user_not_found: {
    title: "Account Setup Incomplete",
    message: "User account not found. Please contact support.",
  },
  server_error: {
    title: "Server Error",
    message: "An unexpected error occurred. Please try again later.",
  },
  invalid_code: {
    title: "Invalid Authorization",
    message: "The authorization code is invalid or has expired. Please try signing in again.",
  },
  invalid_redirect: {
    title: "Invalid Redirect",
    message: "The redirect URL is invalid. Redirecting to home page.",
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


/**
 * Login API Endpoint
 *
 * Handles email/password authentication via Supabase Auth.
 * Accepts form submission (POST with form data), validates credentials,
 * updates user record, and redirects to intended destination.
 *
 * Flow:
 * 1. Parse and validate form data
 * 2. Authenticate with Supabase (signInWithPassword)
 * 3. Update last_seen_at timestamp
 * 4. Redirect to intended destination or dashboard
 */

export const prerender = false;

import type { APIContext } from "astro";

import { LoginSchema } from "@/lib/validation/auth.validation";
import { logAuthFailure, logAuthSuccess } from "@/lib/error-logger";

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  try {
    // Parse form data
    const formData = await context.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const redirectUrl = (formData.get("redirect") as string) || "/";

    // Validate input
    const validation = LoginSchema.safeParse({ email, password });

    if (!validation.success) {
      // Validation failed - redirect back to login with error
      const errorMessage = validation.error?.errors?.[0]?.message || "Invalid input";
      return context.redirect(`/login?error=validation_error&message=${encodeURIComponent(errorMessage)}`);
    }

    const { email: validatedEmail, password: validatedPassword } = validation.data;

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedEmail,
      password: validatedPassword,
    });

    if (error || !data.user) {
      logAuthFailure(null, "Login failed", { error, email: validatedEmail });
      return context.redirect("/login?error=invalid_credentials");
    }

    // Note: We allow login even if email is not verified (as per requirements)
    // The UI will show a verification banner if needed

    // Update user's last_seen_at timestamp using SERVICE ROLE to bypass RLS
    // This is necessary because RLS policies may block updating the user record
    // during login flow (circular dependency with is_admin() function)
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      await supabase.auth.signOut();
      return context.redirect("/login?error=server_error");
    }

    // Create admin client with service role key (bypasses RLS)
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(import.meta.env.SUPABASE_URL, serviceRoleKey);

    // Fetch user record to verify it exists (bypassing RLS)
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    // Check if user record doesn't exist (PGRST116 is "not found" error)
    const userNotFound = userError?.code === "PGRST116" || (!userData && !userError);

    if (userNotFound) {
      // User not in database - this shouldn't happen if registration flow is correct
      // Block login as the user record should have been created during registration
      logAuthFailure(data.user.id, "User record not found during login", { userId: data.user.id });

      // Sign out the user since login cannot proceed without a user record
      await supabase.auth.signOut();

      return context.redirect("/login?error=user_not_found&message=Please%20register%20first");
    }

    if (userError) {
      // Unexpected error fetching user
      logAuthFailure(data.user.id, "Failed to fetch user record", { error: userError });
      await supabase.auth.signOut();
      return context.redirect("/login?error=server_error");
    }

    // Update last_seen_at timestamp
    await adminClient.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", data.user.id);

    logAuthSuccess(data.user.id, "email_password", { action: "login" });

    // Redirect to intended destination
    // Decode the redirect URL and ensure it's a local path
    const decodedRedirect = decodeURIComponent(redirectUrl);
    const finalRedirect = decodedRedirect.startsWith("/") ? decodedRedirect : "/";

    return context.redirect(finalRedirect);
  } catch (error) {
    logAuthFailure(null, "Unexpected error during login", { error });
    return context.redirect("/login?error=server_error");
  }
}

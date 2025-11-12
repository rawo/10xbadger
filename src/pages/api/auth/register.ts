/**
 * Registration API Endpoint
 *
 * Handles new user registration via Supabase Auth.
 * Creates user account, sends verification email, and creates user record.
 *
 * Flow:
 * 1. Validate form data
 * 2. Register with Supabase Auth (signUp)
 * 3. Set is_admin if email is admin@badger.com
 * 4. Send verification email
 * 5. Redirect to verification page
 */

export const prerender = false;

import type { APIContext } from "astro";

import { RegisterSchema } from "@/lib/validation/auth.validation";
import { logAuthFailure, logAuthSuccess } from "@/lib/error-logger";

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  try {
    // Parse form data
    const formData = await context.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    // Validate input
    const validation = RegisterSchema.safeParse({ email, password });

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Invalid input";
      return context.redirect(`/register?error=validation_error&message=${encodeURIComponent(errorMessage)}`);
    }

    const { email: validatedEmail, password: validatedPassword } = validation.data;

    // Check if user already exists
    const { data: existingUser } = await supabase.from("users").select("email").eq("email", validatedEmail).single();

    if (existingUser) {
      return context.redirect("/register?error=email_already_exists");
    }

    // Determine if this should be an admin user
    const isAdmin = validatedEmail === "admin@badger.com";

    // Register with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: validatedEmail,
      password: validatedPassword,
      options: {
        emailRedirectTo: `${context.url.origin}/api/auth/callback`,
        data: {
          is_admin: isAdmin, // Store in user metadata
        },
      },
    });

    if (error) {
      logAuthFailure(null, "Registration failed", { error, email: validatedEmail });

      // Handle specific error codes
      if (error.message.includes("already registered")) {
        return context.redirect("/register?error=email_already_exists");
      }

      return context.redirect("/register?error=registration_failed");
    }

    if (!data.user) {
      return context.redirect("/register?error=registration_failed");
    }

    // Note: We don't create the user record here
    // It will be created automatically on first login via the login endpoint
    // This avoids RLS policy conflicts during registration

    logAuthSuccess(data.user.id, "email_password", { action: "register" });

    // Redirect to verification page
    return context.redirect(`/verify-email?email=${encodeURIComponent(validatedEmail)}`);
  } catch (error) {
    logAuthFailure(null, "Unexpected error during registration", { error });
    return context.redirect("/register?error=server_error");
  }
}

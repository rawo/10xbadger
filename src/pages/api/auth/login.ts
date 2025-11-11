/**
 * Login API Endpoint
 *
 * Handles email/password authentication via Supabase Auth.
 * Accepts form submission (POST with form data), validates credentials,
 * creates/updates user record, and redirects to intended destination.
 *
 * Flow:
 * 1. Parse and validate form data
 * 2. Authenticate with Supabase (signInWithPassword)
 * 3. Create or update user record in database
 * 4. Update last_seen_at timestamp
 * 5. Redirect to intended destination or dashboard
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
      const errorMessage = validation.error.errors[0]?.message || "Invalid input";
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

    // Fetch or create user record
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (userError || !userData) {
      // User not in database yet, create record
      // We need to use service role key to bypass RLS for user creation
      const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        console.error("[Login] SUPABASE_SERVICE_ROLE_KEY not configured");
        await supabase.auth.signOut();
        return context.redirect("/login?error=server_error");
      }

      // Create admin client with service role key (bypasses RLS)
      const { createClient } = await import("@supabase/supabase-js");
      const adminClient = createClient(import.meta.env.SUPABASE_URL, serviceRoleKey);

      // Check if this should be an admin user
      const isAdmin = data.user.email === "admin@badger.com";

      const { data: newUserData, error: insertError } = await adminClient
        .from("users")
        .insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: data.user.email!.split("@")[0],
          is_admin: isAdmin,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Failed to create user record - this is a critical error
        // Block login as per requirements (return 500)
        logAuthFailure(data.user.id, "User record creation failed", { error: insertError });

        // Sign out the user since we can't complete the login
        await supabase.auth.signOut();

        return context.redirect("/login?error=server_error");
      }

      userData = newUserData;
    } else {
      // Update last_seen_at for existing user
      // Use service role key to ensure update succeeds
      const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const adminClient = createClient(import.meta.env.SUPABASE_URL, serviceRoleKey);
        await adminClient.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", data.user.id);
      }
    }

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

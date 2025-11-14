import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { POST } from "../login";

// Mock environment variables
vi.stubEnv("SUPABASE_URL", "http://localhost:54321");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

/**
 * Create a mock Supabase client for testing POST /api/auth/login
 * Supports authentication, user lookup, and timestamp updates
 */
function createMockSupabase(
  options: {
    authSuccess?: boolean;
    authError?: string;
    userId?: string;
    userEmail?: string;
  } = {}
) {
  const { authSuccess = true, authError = null, userId = "user-123", userEmail = "test@example.com" } = options;

  return {
    auth: {
      async signInWithPassword() {
        if (!authSuccess) {
          return {
            data: { user: null, session: null },
            error: { message: authError || "Invalid credentials" },
          };
        }
        return {
          data: {
            user: { id: userId, email: userEmail },
            session: { access_token: "token" },
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}

/**
 * Create a mock admin Supabase client (with service role)
 */
function createMockAdminClient(
  options: {
    userExists?: boolean;
    userFetchError?: boolean;
    updateSuccess?: boolean;
  } = {}
) {
  const { userExists = true, userFetchError = false, updateSuccess = true } = options;

  return {
    from(table: string) {
      if (table === "users") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (userFetchError) {
                      return { data: null, error: { code: "DB_ERROR", message: "Database error" } };
                    }
                    if (!userExists) {
                      return { data: null, error: { code: "PGRST116", message: "No rows found" } };
                    }
                    return {
                      data: {
                        id: "user-123",
                        email: "test@example.com",
                        display_name: "test",
                        is_admin: false,
                        last_seen_at: new Date().toISOString(),
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return Promise.resolve({
                  data: updateSuccess ? {} : null,
                  error: updateSuccess ? null : { message: "Update failed" },
                });
              },
            };
          },
        };
      }
      return {};
    },
  };
}

// Mock @supabase/supabase-js createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createMockAdminClient()),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Login", () => {
    it("should login successfully with valid credentials", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
    });

    it("should redirect to specified redirect URL after login", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");
      formData.append("redirect", "/dashboard");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/dashboard");
    });

    it("should sanitize redirect URL to local paths only", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");
      formData.append("redirect", "https://evil.com");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
    });
  });

  describe("Validation Errors", () => {
    it("should return error for missing email", async () => {
      const formData = new FormData();
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/login?error=validation_error");
    });

    it("should return error for missing password", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/login?error=validation_error");
    });

    it("should return error for invalid email format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/login?error=validation_error");
    });
  });

  describe("Authentication Errors", () => {
    it("should return error for invalid credentials", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrongpassword");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: {
          supabase: createMockSupabase({
            authSuccess: false,
            authError: "Invalid login credentials",
          }),
        },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login?error=invalid_credentials");
    });
  });

  describe("User Record Errors", () => {
    it("should return error when user record not found", async () => {
      // Mock createClient to return admin client with userExists = false
      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockReturnValue(createMockAdminClient({ userExists: false }) as never);

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/login?error=user_not_found");
    });

    it("should return error when user fetch fails", async () => {
      // Mock createClient to return admin client with userFetchError = true
      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockReturnValue(createMockAdminClient({ userFetchError: true }) as never);

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login?error=server_error");
    });
  });

  describe("Server Errors", () => {
    it("should return error when service role key is missing", async () => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/login"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login?error=server_error");

      // Restore env
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    });
  });
});

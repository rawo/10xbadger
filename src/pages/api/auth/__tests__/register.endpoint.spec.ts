import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { POST } from "../register";

// Mock environment variables
vi.stubEnv("SUPABASE_URL", "http://localhost:54321");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

/**
 * Create a mock Supabase client for testing POST /api/auth/register
 * Supports user creation, authentication, and database operations
 */
function createMockSupabase(
  options: {
    existingUser?: boolean;
    signUpSuccess?: boolean;
    signUpError?: string;
    userId?: string;
    userEmail?: string;
  } = {}
) {
  const {
    existingUser = false,
    signUpSuccess = true,
    signUpError = null,
    userId = "new-user-123",
    userEmail = "newuser@example.com",
  } = options;

  return {
    auth: {
      async signUp() {
        if (!signUpSuccess) {
          return {
            data: { user: null, session: null },
            error: { message: signUpError || "Registration failed" },
          };
        }
        return {
          data: {
            user: { id: userId, email: userEmail },
            session: null, // Session is null until email is verified
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(table: string) {
      if (table === "users") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (existingUser) {
                      return {
                        data: { id: userId, email: userEmail },
                        error: null,
                      };
                    }
                    return { data: null, error: { code: "PGRST116" } };
                  },
                };
              },
            };
          },
        };
      }
      return {};
    },
  };
}

/**
 * Create a mock admin Supabase client (with service role)
 */
function createMockAdminClient(
  options: {
    insertSuccess?: boolean;
    insertError?: string;
  } = {}
) {
  const { insertSuccess = true, insertError = null } = options;

  return {
    from(table: string) {
      if (table === "users") {
        return {
          insert() {
            return {
              select() {
                return {
                  async single() {
                    if (!insertSuccess) {
                      return {
                        data: null,
                        error: { message: insertError || "Insert failed", code: "DB_ERROR" },
                      };
                    }
                    return {
                      data: {
                        id: "new-user-123",
                        email: "newuser@example.com",
                        display_name: "newuser",
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

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Registration", () => {
    it("should register successfully with valid credentials", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/verify-email");
      expect(response.headers.get("Location")).toContain("email=newuser%40example.com");
    });

    it("should create admin user for admin@badger.com", async () => {
      const formData = new FormData();
      formData.append("email", "admin@badger.com");
      formData.append("password", "adminpass123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: {
          supabase: createMockSupabase({
            userId: "admin-user-123",
            userEmail: "admin@badger.com",
          }),
        },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/verify-email");
    });
  });

  describe("Validation Errors", () => {
    it("should return error for missing email", async () => {
      const formData = new FormData();
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/register?error=validation_error");
    });

    it("should return error for missing password", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@example.com");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/register?error=validation_error");
    });

    it("should return error for invalid email format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/register?error=validation_error");
    });

    it("should return error for weak password", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "123"); // Too short

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/register?error=validation_error");
    });
  });

  describe("Duplicate User Errors", () => {
    it("should return error when email already exists in database", async () => {
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: {
          supabase: createMockSupabase({
            existingUser: true,
            userEmail: "existing@example.com",
          }),
        },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/register?error=email_already_exists");
    });

    it("should return error when Supabase Auth reports user already registered", async () => {
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: {
          supabase: createMockSupabase({
            signUpSuccess: false,
            signUpError: "User already registered",
          }),
        },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/register?error=email_already_exists");
    });
  });

  describe("Registration Errors", () => {
    it("should return error when Supabase Auth signup fails", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: {
          supabase: createMockSupabase({
            signUpSuccess: false,
            signUpError: "Signup service unavailable",
          }),
        },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/register?error=registration_failed");
    });

    it("should return error when user record creation fails", async () => {
      // Mock createClient to return admin client with insertSuccess = false
      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockReturnValue(
        createMockAdminClient({
          insertSuccess: false,
          insertError: "Database constraint violation",
        }) as never
      );

      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/register?error=server_error");
    });
  });

  describe("Server Errors", () => {
    it("should return error when service role key is missing", async () => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/register?error=server_error");

      // Restore env
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    });
  });

  describe("User Record Creation", () => {
    it("should create user record with correct data", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const mockAdminClient = createMockAdminClient();
      vi.mocked(createClient).mockReturnValue(mockAdminClient as never);

      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "password123");

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const context = {
        request: req,
        locals: { supabase: createMockSupabase() },
        redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
        url: new URL("http://localhost/api/auth/register"),
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/verify-email");
    });
  });
});

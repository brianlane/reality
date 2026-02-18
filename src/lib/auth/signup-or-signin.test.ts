import { describe, it, expect, vi } from "vitest";
import { signUpOrSignIn } from "./signup-or-signin";
import { ERROR_MESSAGES } from "@/lib/error-messages";
import type { Session } from "@supabase/supabase-js";

// Mock session for successful responses
const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: "bearer",
  user: {
    id: "user-123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  },
};

describe("signUpOrSignIn", () => {
  const testEmail = "test@example.com";
  const testPassword = "password123";
  const emailRedirectTo = "http://localhost/dashboard";

  it("should successfully sign up a new user", async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: mockSession,
            user: { identities: [{ provider: "email" }] },
          },
          error: null,
        }),
        signInWithPassword: vi.fn(),
      },
    };

    const result = await signUpOrSignIn({
      supabase: mockSupabase,
      email: testEmail,
      password: testPassword,
      emailRedirectTo,
    });

    expect(result.session).toEqual(mockSession);
    expect(result.errorMessage).toBeUndefined();
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo,
        data: { email: testEmail },
      },
    });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("should fallback to sign-in when user already exists (empty identities)", async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: null,
            user: { identities: [] }, // Empty identities = existing user
          },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      },
    };

    const result = await signUpOrSignIn({
      supabase: mockSupabase,
      email: testEmail,
      password: testPassword,
      emailRedirectTo,
    });

    expect(result.session).toEqual(mockSession);
    expect(result.errorMessage).toBeUndefined();
    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: testEmail,
      password: testPassword,
    });
  });

  it('should fallback to sign-in when signup error says "already registered"', async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: "User already registered" },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      },
    };

    const result = await signUpOrSignIn({
      supabase: mockSupabase,
      email: testEmail,
      password: testPassword,
      emailRedirectTo,
    });

    expect(result.session).toEqual(mockSession);
    expect(result.errorMessage).toBeUndefined();
  });

  it("should return error when sign-in fails after detecting existing user", async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: null,
            user: { identities: [] },
          },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "Invalid credentials" },
        }),
      },
    };

    const result = await signUpOrSignIn({
      supabase: mockSupabase,
      email: testEmail,
      password: testPassword,
      emailRedirectTo,
    });

    expect(result.session).toBeNull();
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.ACCOUNT_EXISTS_PASSWORD_INCORRECT,
    );
  });

  it("should return error when signup fails with non-already-registered error", async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: "Invalid email format" },
        }),
        signInWithPassword: vi.fn(),
      },
    };

    const result = await signUpOrSignIn({
      supabase: mockSupabase,
      email: testEmail,
      password: testPassword,
      emailRedirectTo,
    });

    expect(result.session).toBeNull();
    expect(result.errorMessage).toBe(
      "Unable to create account. Please try again.",
    );
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should handle "already registered" variation in error message', async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: "Email already registered" },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      },
    };

    const result = await signUpOrSignIn({
      supabase: mockSupabase,
      email: testEmail,
      password: testPassword,
      emailRedirectTo,
    });

    expect(result.session).toEqual(mockSession);
    expect(result.errorMessage).toBeUndefined();
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
  });
});

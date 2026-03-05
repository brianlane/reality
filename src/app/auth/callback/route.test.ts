import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockExchangeCodeForSession = vi.fn();
const mockSupabase = {
  auth: {
    exchangeCodeForSession: mockExchangeCodeForSession,
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
const mockCreateClient = vi.mocked(createSupabaseServerClient);

function makeRequest(url: string): Request {
  return new Request(url);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it("exchanges a valid code and redirects to safePath", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      makeRequest("http://localhost/auth/callback?code=abc123&next=/dashboard"),
    );

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("redirects to sign-in when no code is provided", async () => {
    const res = await GET(makeRequest("http://localhost/auth/callback"));

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "http://localhost/sign-in?error=auth-code-error",
    );
  });

  it("redirects to sign-in when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid code" },
    });

    const res = await GET(
      makeRequest("http://localhost/auth/callback?code=bad"),
    );

    expect(res.headers.get("location")).toBe(
      "http://localhost/sign-in?error=auth-code-error",
    );
  });

  it("redirects to forgot-password when a reset-password code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "expired" },
    });

    const res = await GET(
      makeRequest(
        "http://localhost/auth/callback?code=bad&next=/reset-password",
      ),
    );

    expect(res.headers.get("location")).toBe(
      "http://localhost/forgot-password?error=link-expired",
    );
  });

  it("redirects to sign-in when supabase client is unavailable", async () => {
    mockCreateClient.mockResolvedValue(null as never);

    const res = await GET(
      makeRequest("http://localhost/auth/callback?code=abc123"),
    );

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "http://localhost/sign-in?error=auth-code-error",
    );
  });

  it("falls back to / for a protocol-relative next URL", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      makeRequest(
        "http://localhost/auth/callback?code=abc&next=//evil.com/steal",
      ),
    );

    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("falls back to / for an absolute next URL", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      makeRequest(
        "http://localhost/auth/callback?code=abc&next=https://evil.com",
      ),
    );

    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("falls back to / when next targets an admin path", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      makeRequest("http://localhost/auth/callback?code=abc&next=/admin/users"),
    );

    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("blocks path traversal that resolves to an admin path", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      makeRequest(
        "http://localhost/auth/callback?code=abc&next=/foo/../admin/users",
      ),
    );

    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("uses / as the default path when next is omitted", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      makeRequest("http://localhost/auth/callback?code=abc"),
    );

    expect(res.headers.get("location")).toBe("http://localhost/");
  });
});

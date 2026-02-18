import { ERROR_MESSAGES } from "@/lib/error-messages";
import type { Session } from "@supabase/supabase-js";

type SupabaseLikeClient = {
  auth: {
    signUp: (params: {
      email: string;
      password: string;
      options?: {
        emailRedirectTo?: string;
        data?: Record<string, string>;
      };
    }) => Promise<{
      data: {
        session: Session | null;
        user?: { identities?: unknown[] } | null;
      };
      error: { message: string } | null;
    }>;
    signInWithPassword: (params: {
      email: string;
      password: string;
    }) => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
  };
};

function isAlreadyRegisteredError(message: string): boolean {
  return (
    message.includes("already registered") ||
    message.includes("User already registered")
  );
}

export async function signUpOrSignIn(params: {
  supabase: SupabaseLikeClient;
  email: string;
  password: string;
  emailRedirectTo: string;
}): Promise<{ session: Session | null; errorMessage?: string }> {
  const { supabase, email, password, emailRedirectTo } = params;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { email },
    },
  });

  const looksLikeExistingUser =
    !signUpError &&
    !signUpData.session &&
    Array.isArray(signUpData.user?.identities) &&
    signUpData.user.identities.length === 0;
  const shouldFallbackToSignIn = !!signUpError || looksLikeExistingUser;

  if (!shouldFallbackToSignIn) {
    return { session: signUpData.session };
  }

  const canFallback =
    looksLikeExistingUser ||
    (!!signUpError && isAlreadyRegisteredError(signUpError.message));
  if (!canFallback) {
    // Return the actual Supabase error message for better user feedback
    // (e.g., rate limit, invalid email, disabled signups, etc.)
    return {
      session: null,
      errorMessage: signUpError?.message || "Unable to create account. Please try again.",
    };
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });
  if (signInError) {
    return {
      session: null,
      errorMessage: ERROR_MESSAGES.ACCOUNT_EXISTS_PASSWORD_INCORRECT,
    };
  }

  return { session: signInData.session };
}

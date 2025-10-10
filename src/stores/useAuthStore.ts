import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Helper to get auth token for API calls
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

type User = { id: string; email?: string | null };
type State = {
  user: User | null;
  loading: boolean;
  error?: string | null;
  isSigningIn: boolean;
  isSigningUp: boolean;
  hydrateFromSupabase: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

export const useAuthStore = create<State>((set) => ({
  user: null,
  loading: true,
  error: null,
  isSigningIn: false,
  isSigningUp: false,

  hydrateFromSupabase: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.error("Failed to get session:", error);
        set({
          user: null,
          loading: false,
          error: "Failed to authenticate. Please try again."
        });
        return;
      }

      const session = data.session;

      // Validate session data
      if (session?.user) {
        if (!session.user.id || !session.user.email) {
          logger.warn("Invalid session data:", session.user);
          set({
            user: null,
            loading: false,
            error: "Invalid session data. Please sign in again."
          });
          return;
        }
      }

      set({
        user: session?.user ? { id: session.user.id, email: session.user.email } : null,
        loading: false,
        error: null,
      });

      // Subscribe to auth state changes with error handling
      supabase.auth.onAuthStateChange((event, session) => {
        logger.auth("Auth state changed:", event);

        try {
          if (session?.user) {
            // Validate user data
            if (!session.user.id || !session.user.email) {
              logger.warn("Invalid user data in auth state change:", session.user);
              set({
                user: null,
                loading: false,
                error: "Invalid user data. Please sign in again."
              });
              return;
            }
          }

          set({
            user: session?.user
              ? { id: session.user.id, email: session.user.email }
              : null,
            loading: false,
            error: null,
          });
        } catch (error) {
          logger.error("Error handling auth state change:", error);
          set({
            user: null,
            loading: false,
            error: "Authentication error. Please sign in again."
          });
        }
      });
    } catch (error) {
      logger.error("Unexpected error in hydrateFromSupabase:", error);
      set({
        user: null,
        loading: false,
        error: "Authentication failed. Please try again."
      });
    }
  },

  signInWithPassword: async (email, password) => {
    // Check if already signing in
    const state = useAuthStore.getState();
    if (state.isSigningIn) {
      logger.warn("Sign in already in progress, ignoring duplicate request");
      return;
    }

    set({ error: null, loading: true, isSigningIn: true });
    logger.auth("Attempting sign in with email:", email);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sign in timeout")), 15000) // Increased to 15 seconds
      );

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

      logger.auth("Sign in result:", { data, error });
      set({ loading: false, isSigningIn: false, error: error?.message ?? null });

      if (!error) {
        window.location.assign("/");
      }
    } catch (error: unknown) {
      logger.error("Sign in failed:", error);
      const errorMessage = error instanceof Error
        ? (error.message === "Sign in timeout"
          ? "Sign in timed out. Please check your connection and try again."
          : "Sign in failed. Please try again.")
        : "Sign in failed. Please try again.";

      set({
        loading: false,
        isSigningIn: false,
        error: errorMessage
      });
    }
  },

  signUpWithPassword: async (email, password) => {
    // Check if already signing up
    const state = useAuthStore.getState();
    if (state.isSigningUp) {
      logger.warn("Sign up already in progress, ignoring duplicate request");
      return;
    }

    set({ error: null, loading: true, isSigningUp: true });
    logger.auth("Attempting sign up with email:", email);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sign up timeout")), 15000)
      );

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);

      logger.auth("Sign up result:", { data, error });
      set({ loading: false, isSigningUp: false, error: error?.message ?? null });
      // Ved "Require email confirmation" får brugeren en mail.
    } catch (error: unknown) {
      logger.error("Sign up failed:", error);
      const errorMessage = error instanceof Error
        ? (error.message === "Sign up timeout"
          ? "Sign up timed out. Please check your connection and try again."
          : "Sign up failed. Please try again.")
        : "Sign up failed. Please try again.";

      set({
        loading: false,
        isSigningUp: false,
        error: errorMessage
      });
    }
  },

  sendPasswordReset: async (email) => {
    set({ error: null, loading: true });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    set({ loading: false, error: error?.message ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  },
}));

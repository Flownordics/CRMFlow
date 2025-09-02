import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

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

  hydrateFromSupabase: async () => {
    set({ loading: true });
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    set({
      user: s?.user ? { id: s.user.id, email: s.user.email } : null,
      loading: false,
      error: null,
    });
    // subscribe to changes
    supabase.auth.onAuthStateChange((_evt, session) => {
      set({
        user: session?.user
          ? { id: session.user.id, email: session.user.email }
          : null,
        loading: false,
        error: null,
      });
    });
  },

  signInWithPassword: async (email, password) => {
    set({ error: null, loading: true });
    console.log("[Auth] Attempting sign in with email:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log("[Auth] Sign in result:", { data, error });
    set({ loading: false, error: error?.message ?? null });
    if (!error) window.location.assign("/");
  },

  signUpWithPassword: async (email, password) => {
    set({ error: null, loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    set({ loading: false, error: error?.message ?? null });
    // Ved "Require email confirmation" får brugeren en mail.
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

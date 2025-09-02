import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "../useAuthStore";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

// Import the mocked supabase
import { supabase } from "@/integrations/supabase/client";

const mockSupabase = vi.mocked(supabase);

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    act(() => {
      useAuthStore.setState({
        user: null,
        loading: false,
        error: null,
      });
    });
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("hydrateFromSupabase", () => {
    it("should hydrate user from session", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockSession = { user: mockUser };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.hydrateFromSupabase();
      });

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle no session", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.hydrateFromSupabase();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should set up auth state change listener", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.hydrateFromSupabase();
      });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe("signInWithPassword", () => {
    it("should sign in successfully", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null,
      });

      // Mock window.location.assign
      const mockAssign = vi.fn();
      Object.defineProperty(window, "location", {
        value: { assign: mockAssign },
        writable: true,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithPassword("test@example.com", "password");
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password",
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockAssign).toHaveBeenCalledWith("/");
    });

    it("should handle sign in error", async () => {
      const error = { message: "Invalid credentials" };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithPassword("test@example.com", "wrong");
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Invalid credentials");
    });
  });

  describe("signUpWithPassword", () => {
    it("should sign up successfully", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUpWithPassword("test@example.com", "password");
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password",
        options: {
          emailRedirectTo: expect.stringContaining("/login"),
        },
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle sign up error", async () => {
      const error = { message: "Email already exists" };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUpWithPassword(
          "existing@example.com",
          "password",
        );
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Email already exists");
    });
  });

  describe("sendPasswordReset", () => {
    it("should send password reset email", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.sendPasswordReset("test@example.com");
      });

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        {
          redirectTo: expect.stringContaining("/login"),
        },
      );
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle password reset error", async () => {
      const error = { message: "User not found" };
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.sendPasswordReset("nonexistent@example.com");
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("User not found");
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Mock window.location.assign
      const mockAssign = vi.fn();
      Object.defineProperty(window, "location", {
        value: { assign: mockAssign },
        writable: true,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockAssign).toHaveBeenCalledWith("/login");
    });
  });
});

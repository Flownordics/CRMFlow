import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuthStore } from "@/stores/useAuthStore";
import { validateInvitationToken, acceptInvitation } from "@/services/invitations";
import { supabase } from "@/integrations/supabase/client";
import { toastBus } from "@/lib/toastBus";
import { logger } from "@/lib/logger";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Min. 8 chars"),
});
type RegisterValues = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationToken = searchParams.get("invitation");
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [validatingInvitation, setValidatingInvitation] = useState(!!invitationToken);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const { signUpWithPassword, loading, error } = useAuthStore();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: invitationEmail || "", password: "" },
  });

  // Validate invitation token on mount
  useEffect(() => {
    const validateInvitation = async () => {
      if (!invitationToken) {
        setValidatingInvitation(false);
        return;
      }

      try {
        const result = await validateInvitationToken(invitationToken);
        if (result.is_valid && result.email) {
          setInvitationEmail(result.email);
          setValue("email", result.email);
          setInvitationError(null);
        } else {
          setInvitationError("Invalid or expired invitation link");
        }
      } catch (error) {
        logger.error("Failed to validate invitation:", error);
        setInvitationError("Failed to validate invitation");
      } finally {
        setValidatingInvitation(false);
      }
    };

    validateInvitation();
  }, [invitationToken, setValue]);

  // Listen for auth state changes to accept invitation after signup
  useEffect(() => {
    if (!invitationToken) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && invitationToken) {
        try {
          await acceptInvitation(invitationToken, session.user.id);
          toastBus.emit({
            title: "Invitation accepted",
            description: "Your account has been created and the invitation has been accepted.",
            variant: "default"
          });
          navigate("/");
        } catch (error) {
          logger.error("Failed to accept invitation:", error);
          toastBus.emit({
            title: "Warning",
            description: "Account created but failed to accept invitation. Please contact support.",
            variant: "destructive"
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [invitationToken, navigate]);

  const onSubmit = async (v: RegisterValues) => {
    try {
      // Sign up the user
      // The invitation will be accepted automatically via the auth state listener
      await signUpWithPassword(v.email, v.password);
      
      // If email confirmation is not required, the auth state change will trigger immediately
      // If email confirmation is required, the invitation will be accepted after they confirm
    } catch (error) {
      logger.error("Sign up failed:", error);
      // Error is already handled by useAuthStore
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-h2">Create account</h1>
      {validatingInvitation && (
        <p className="text-sm text-muted-foreground">Validating invitation...</p>
      )}
      {invitationError && (
        <p className="text-sm text-destructive" role="alert">
          {invitationError}
        </p>
      )}
      {invitationEmail && !invitationError && (
        <p className="text-sm text-muted-foreground">
          You've been invited to join as <strong>{invitationEmail}</strong>
        </p>
      )}
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Input
            placeholder="Email"
            type="email"
            {...register("email")}
            aria-invalid={!!errors.email}
            disabled={!!invitationEmail}
          />
          {errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <PasswordField
            value={watch("password")}
            onChange={(e) => setValue("password", e.target.value)}
          />
          {errors.password && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <div className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <a className="underline" href="/login">
          Sign in
        </a>
      </div>
    </div>
  );
}

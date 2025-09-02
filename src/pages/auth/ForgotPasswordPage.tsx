import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";

const ForgotSchema = z.object({ email: z.string().email() });
type ForgotValues = z.infer<typeof ForgotSchema>;

export default function ForgotPasswordPage() {
  const { sendPasswordReset, loading, error } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (v: ForgotValues) => sendPasswordReset(v.email);

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-h2">Reset password</h1>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Input
            placeholder="Your email"
            type="email"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <div className="text-sm text-muted-foreground">
        Back to{" "}
        <a className="underline" href="/login">
          Sign in
        </a>
      </div>
    </div>
  );
}

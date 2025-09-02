import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuthStore } from "@/stores/useAuthStore";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Min. 8 chars"),
});
type RegisterValues = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const { signUpWithPassword, loading, error } = useAuthStore();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (v: RegisterValues) =>
    signUpWithPassword(v.email, v.password);

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-h2">Create account</h1>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Input
            placeholder="Email"
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

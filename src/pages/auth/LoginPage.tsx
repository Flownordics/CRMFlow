import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "@/components/ui/separator";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { signInWithPassword, loading, error } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (v: LoginValues) => signInWithPassword(v.email, v.password);

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-h2">Sign in</h1>

      {/* Email/password */}
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
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Google integration removed - starting fresh */}

      <div className="flex justify-between text-sm text-muted-foreground">
        <a className="underline" href="/register">
          Create an account
        </a>
        <a className="underline" href="/forgot">
          Forgot password?
        </a>
      </div>
    </div>
  );
}

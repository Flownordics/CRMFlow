import { PropsWithChildren, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

export function AuthGate({ children }: PropsWithChildren) {
  const { hydrateFromSupabase } = useAuthStore();
  useEffect(() => {
    hydrateFromSupabase();
  }, [hydrateFromSupabase]);
  return <>{children}</>;
}

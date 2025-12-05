import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { toastBus } from "@/lib/toastBus";

export function ToastBridge() {
  useEffect(() => {
    return toastBus.on((m) => {
      const toastOptions: Parameters<typeof toast>[0] = {
        title: m.title,
        description: m.description,
        variant: m.variant,
      };

      // Add action button if provided
      if (m.action) {
        toastOptions.action = (
          <ToastAction
            altText={m.action.label}
            onClick={m.action.onClick}
          >
            {m.action.label}
          </ToastAction>
        );
      }

      toast(toastOptions);
    });
  }, []);
  
  return null;
}

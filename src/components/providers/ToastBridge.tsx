import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { toastBus } from "@/lib/toastBus";

export function ToastBridge() {
  useEffect(() => toastBus.on((m) => toast(m)), []);
  return null;
}

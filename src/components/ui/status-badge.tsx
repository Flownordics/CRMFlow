import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeStyles = cva("px-2 py-0.5 rounded-full text-xs font-medium", {
  variants: {
    intent: {
      draft: "bg-status-draft text-black/70",
      active: "bg-status-active text-black/70",
      closed: "bg-status-closed text-black/70",
      overdue: "bg-status-overdue text-black/70",
    },
    subtle: {
      true: "opacity-85",
      false: "",
    },
  },
  defaultVariants: { subtle: false },
});

type Props = VariantProps<typeof badgeStyles> & { children: React.ReactNode };

export function StatusBadge({ intent = "draft", subtle, children }: Props) {
  return (
    <Badge className={cn(badgeStyles({ intent, subtle }))}>{children}</Badge>
  );
}

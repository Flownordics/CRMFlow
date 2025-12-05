import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  actions?: React.ReactNode; // For multiple actions
  className?: string;
  useCard?: boolean; // Whether to wrap in Card component
}

/**
 * Standardized EmptyState component for consistent empty state design across the application.
 * 
 * Features:
 * - Optional icon display
 * - Single or multiple actions
 * - Card wrapper option
 * - Consistent styling
 * 
 * @example
 * <EmptyState
 *   icon={FileText}
 *   title="No quotes yet"
 *   description="Create your first quote to get started"
 *   action={<Button>New Quote</Button>}
 * />
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  actions,
  className,
  useCard = false,
}: EmptyStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      useCard ? "p-8" : "rounded-2xl border p-8 shadow-card",
      className
    )}>
      {Icon && (
        <div className="rounded-full bg-muted/10 p-3 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      
      <h3 className={cn(
        "mb-2",
        Icon ? "text-lg font-semibold" : "text-h3 mb-1"
      )}>
        {title}
      </h3>
      
      <p className={cn(
        "text-muted-foreground mb-6",
        Icon ? "max-w-sm" : "text-sm mb-4"
      )}>
        {description}
      </p>
      
      {(action || actions) && (
        <div className={cn(
          "flex gap-3",
          actions ? "flex-col sm:flex-row" : ""
        )}>
      {action}
          {actions}
        </div>
      )}
    </div>
  );

  if (useCard) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}

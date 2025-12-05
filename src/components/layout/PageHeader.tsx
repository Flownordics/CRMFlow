import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";

export function PageHeader({
  title,
  subtitle,
  actions,
  showBreadcrumbs = false,
}: {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
}) {
  return (
    <div className="mb-4">
      {showBreadcrumbs && <BreadcrumbNavigation />}
      <div className="flex items-center justify-between mb-2">
        {typeof title === "string" ? <h1 className="text-h1">{title}</h1> : title}
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {subtitle && (
        <div className="text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

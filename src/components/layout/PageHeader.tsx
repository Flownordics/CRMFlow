export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-h1">{title}</h1>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {subtitle && (
        <div className="text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

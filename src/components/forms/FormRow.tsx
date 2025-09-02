export function FormRow({
  label,
  control,
}: {
  label: string;
  control: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[200px_1fr] sm:items-center">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center">{control}</div>
    </div>
  );
}

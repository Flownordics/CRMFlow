export function DebugPanel({ label, isLoading, error, length }: { label: string; isLoading: boolean; error: any; length: number | string }) {
    return (
        <div className="rounded-xl border bg-muted/20 p-3 text-xs">
            <div><b>{label}</b> · isLoading={String(isLoading)} · error={String(!!error)} · length={length}</div>
            {error && <pre className="mt-2 overflow-auto text-[10px] text-destructive">{(error as any)?.message ?? String(error)}</pre>}
        </div>
    );
}

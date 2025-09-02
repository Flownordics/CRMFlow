export function DropPlaceholder() {
    return (
        <div
            className="h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 flex items-center justify-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/20"
            aria-label="Drop zone for deals"
        >
            <span className="text-xs text-muted-foreground font-medium">Drop deal here</span>
        </div>
    );
}

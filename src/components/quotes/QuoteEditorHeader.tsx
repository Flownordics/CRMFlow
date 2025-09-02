import { getQuoteStatusTheme, statusTokenBg, statusTokenText } from "./statusTheme";
import { formatMoneyMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Quote } from "@/services/quotes";

interface QuoteEditorHeaderProps {
    quote: Quote;
    onSend?: () => void;
    onOpenPdf?: () => void;
    onConvert?: () => void;
}

export function QuoteEditorHeader({ quote, onSend, onOpenPdf, onConvert }: QuoteEditorHeaderProps) {
    const theme = getQuoteStatusTheme(quote.status);
    const Icon = theme.icon;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-card">
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                    statusTokenBg(theme.color), statusTokenText(theme.color))}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {quote.status}
                </span>
                <div className="font-medium truncate">{quote.number ?? "Quote"}</div>
                <div className="text-sm text-muted-foreground truncate">
                    {quote.notes ?? "—"}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {onSend && (
                    <Button variant="secondary" onClick={onSend} aria-label="Send quote">
                        Send
                    </Button>
                )}
                {onOpenPdf && (
                    <Button variant="outline" onClick={onOpenPdf} aria-label="Open PDF">
                        PDF
                    </Button>
                )}
                {onConvert && (
                    <Button onClick={onConvert} aria-label="Convert to order">
                        Convert
                    </Button>
                )}
            </div>
        </div>
    );
}

import { getQuoteStatusTheme, statusTokenBg, statusTokenText, statusTokenRing } from "./statusTheme";
import { formatMoneyMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileDown, Mail, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Quote } from "@/services/quotes";
import { Link } from "react-router-dom";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

interface QuoteCardProps {
    quote: Quote;
    onSend?: (quote: Quote) => void;
    onOpenPdf?: (quote: Quote) => void;
    onConvertToOrder?: (quote: Quote) => void;
}

export function QuoteCard({ quote, onSend, onOpenPdf, onConvertToOrder }: QuoteCardProps) {
    const theme = getQuoteStatusTheme(quote.status);
    const Icon = theme.icon;

    const isDueSoon = (validUntil?: string | null) => {
        if (!validUntil) return false;
        const dueDate = new Date(validUntil);
        const now = new Date();
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Card className={cn(
            "relative p-4 rounded-2xl border bg-card shadow-card hover:shadow-hover transition-all duration-200",
            statusTokenRing(theme.color),
            "hover:scale-[1.02] hover:-translate-y-1"
        )}>
            {/* Status indicator bar */}
            <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l-2xl", statusTokenBg(theme.color))} aria-hidden="true" />

            {/* Header with icon and number */}
            <div className="flex items-center gap-2 mb-3">
                <Icon className={cn("h-4 w-4", statusTokenText(theme.color))} aria-hidden="true" />
                <h3 className="font-medium truncate text-sm">
                    {quote.number ?? generateFriendlyNumber(quote.id, 'quote')}
                </h3>
            </div>

            {/* Company/Deal info */}
            <div className="text-sm text-muted-foreground truncate mb-3">
                {quote.notes || "—"}
            </div>

            {/* Total amount */}
            <div className="text-lg font-semibold mb-2">
                {formatMoneyMinor(quote.total_minor, quote.currency || "DKK")}
            </div>

            {/* Dates */}
            <div className="text-xs text-muted-foreground mb-3">
                <div>Issued: {formatDate(quote.issue_date)}</div>
                {quote.valid_until && (
                    <div>Valid until: {formatDate(quote.valid_until)}</div>
                )}
            </div>

            {/* Due soon warning */}
            {isDueSoon(quote.valid_until) && (
                <div className="mb-3">
                    <span className="inline-block rounded-full bg-warning/10 text-warning px-2 py-1 text-xs font-medium">
                        Due soon
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                {onSend && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onSend(quote)}
                                aria-label="Send quote"
                            >
                                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send quote</TooltipContent>
                    </Tooltip>
                )}

                {onOpenPdf && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onOpenPdf(quote)}
                                aria-label="Open PDF"
                            >
                                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open PDF</TooltipContent>
                    </Tooltip>
                )}

                {onConvertToOrder && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onConvertToOrder(quote)}
                                disabled={quote.status === "accepted"}
                                aria-label="Convert to Order"
                            >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {quote.status === "accepted" ? "Already converted" : "Convert to Order"}
                        </TooltipContent>
                    </Tooltip>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                            aria-label="Open editor"
                        >
                            <Link to={`/quotes/${quote.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open editor</TooltipContent>
                </Tooltip>
            </div>
        </Card>
    );
}

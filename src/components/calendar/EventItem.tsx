import { cn } from "@/lib/utils";
import { getEventTheme, tokenBg, tokenText, tokenRing } from "./eventTheme";
import { MergedEvent } from "@/lib/calendar-utils";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, Calendar, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

interface EventItemProps {
    event: MergedEvent;
    className?: string;
}

export function EventItem({ event, className }: EventItemProps) {
    const navigate = useNavigate();
    const { t } = useI18n();

    const kind = event.kind || 'other';
    const theme = getEventTheme(kind);
    const Icon = theme.icon;

    const handleCrmNavigation = (type: string, id: string) => {
        switch (type) {
            case 'deal':
                navigate(`/deals/${id}`);
                break;
            case 'company':
                navigate(`/companies/${id}`);
                break;
            case 'quote':
                navigate(`/quotes/${id}`);
                break;
            case 'order':
                navigate(`/orders/${id}`);
                break;
        }
    };

    const formatTimeRange = () => {
        if (!event.all_day) {
            const start = parseISO(event.start_at);
            const end = parseISO(event.end_at);
            return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        } else {
            const start = parseISO(event.start_at);
            const end = parseISO(event.end_at);
            if (start.getTime() === end.getTime()) {
                return format(start, 'MMM dd');
            }
            return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
        }
    };

    return (
        <div
            className={cn(
                "rounded-xl border bg-card p-3 shadow-card hover:shadow-hover transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2",
                tokenRing(theme.color),
                event.all_day && "bg-muted/50",
                className
            )}
        >
            {/* Event Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        tokenBg(theme.color),
                        tokenText(theme.color)
                    )}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(kind as keyof typeof t)}
                    </span>
                    <h3 className="text-sm font-medium truncate flex-1">
                        {event.title}
                    </h3>
                </div>

                {/* Source Badge */}
                <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                    event.source === 'native'
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                )}>
                    {event.source === 'native' ? (
                        <Database className="h-3 w-3" aria-hidden="true" />
                    ) : (
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                    )}
                    {event.source === 'native' ? t('event_source_native') : t('event_source_google')}
                </span>
            </div>

            {/* Event Details */}
            <div className="space-y-2">
                {/* Time */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatTimeRange()}</span>
                </div>

                {/* Location */}
                {event.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="truncate">{event.location}</span>
                    </div>
                )}

                {/* Description */}
                {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {event.description}
                    </p>
                )}

                {/* Attendees */}
                {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">{t('attendees')}:</span>
                        <span>{event.attendees.map(att => att.name || att.email).join(', ')}</span>
                    </div>
                )}

                {/* CRM Relations (only for native events) */}
                {event.source === 'native' && (event.deal_id || event.company_id || event.quote_id || event.order_id) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {event.deal_id && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleCrmNavigation('deal', event.deal_id!)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleCrmNavigation('deal', event.deal_id!)}
                            >
                                {t('deal')}: {event.deal_id}
                            </span>
                        )}
                        {event.company_id && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleCrmNavigation('company', event.company_id!)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleCrmNavigation('company', event.company_id!)}
                            >
                                {t('company')}: {event.company_id}
                            </span>
                        )}
                        {event.quote_id && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleCrmNavigation('quote', event.quote_id!)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleCrmNavigation('quote', event.quote_id!)}
                            >
                                {t('quote')}: {event.quote_id}
                            </span>
                        )}
                        {event.order_id && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleCrmNavigation('order', event.order_id!)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleCrmNavigation('order', event.order_id!)}
                            >
                                {t('order')}: {event.order_id}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

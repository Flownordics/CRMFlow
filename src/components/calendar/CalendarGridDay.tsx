import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MergedEvent } from "@/lib/calendar-utils";
import { getEventTheme, tokenBg, tokenText } from "./eventTheme";
import { CheckSquare, Calendar, CalendarCheck } from "lucide-react";

interface CalendarGridDayProps {
    date: Date;
    events: MergedEvent[];
    isCurrentMonth: boolean;
    isToday: boolean;
    onClick?: () => void;
    onEventClick?: (event: MergedEvent) => void;
}

export function CalendarGridDay({
    date,
    events,
    isCurrentMonth,
    isToday,
    onClick,
    onEventClick,
}: CalendarGridDayProps) {
    const dayNumber = format(date, 'd');
    const hasEvents = events.length > 0;

    return (
        <div
            className={cn(
                "min-h-[100px] border border-border/50 bg-background hover:bg-muted/30 transition-colors cursor-pointer",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-primary/10 border-primary/50"
            )}
            onClick={onClick}
        >
            {/* Day number */}
            <div className="p-2">
                <span
                    className={cn(
                        "text-sm font-medium",
                        isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                    )}
                >
                    {dayNumber}
                </span>
            </div>

            {/* Events */}
            <div className="px-2 pb-2 space-y-1">
                {events.slice(0, 3).map((event) => {
                    const theme = getEventTheme(event.kind);
                    const Icon = event.source === 'task' ? CheckSquare :
                        event.source === 'google' ? Calendar : CalendarCheck;

                    return (
                        <div
                            key={event.id}
                            className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                                tokenBg(theme.color),
                                tokenText(theme.color)
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                            }}
                            title={`${event.title} - ${format(new Date(event.start_at), 'HH:mm')}`}
                        >
                            <div className="flex items-center gap-1">
                                <Icon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{event.title}</span>
                            </div>
                        </div>
                    );
                })}
                {events.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                        +{events.length - 3} more
                    </div>
                )}
            </div>
        </div>
    );
}

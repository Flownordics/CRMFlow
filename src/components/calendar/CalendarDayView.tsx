import React from "react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MergedEvent } from "@/lib/calendar-utils";
import { getEventTheme, tokenBg, tokenText } from "./eventTheme";
import { CheckSquare, Calendar, Database, Clock } from "lucide-react";

interface CalendarDayViewProps {
    currentDate: Date;
    events: MergedEvent[];
    onDateChange: (date: Date) => void;
    onPreviousDay: () => void;
    onNextDay: () => void;
    onToday: () => void;
    onEventClick?: (event: MergedEvent) => void;
}

export function CalendarDayView({
    currentDate,
    events,
    onDateChange,
    onPreviousDay,
    onNextDay,
    onToday,
    onEventClick,
}: CalendarDayViewProps) {
    const isCurrentDay = isToday(currentDate);

    // Filter events for the current day
    const dayEvents = events.filter(event =>
        isSameDay(new Date(event.start_at), currentDate)
    );

    // Sort events by start time
    const sortedEvents = dayEvents.sort((a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

    // Group events by hour
    const eventsByHour = sortedEvents.reduce((acc, event) => {
        const hour = new Date(event.start_at).getHours();
        if (!acc[hour]) {
            acc[hour] = [];
        }
        acc[hour].push(event);
        return acc;
    }, {} as Record<number, MergedEvent[]>);

    // Generate hours array (6 AM to 11 PM)
    const hours = Array.from({ length: 18 }, (_, i) => i + 6);

    return (
        <div className="bg-card rounded-lg border shadow-sm">
            {/* Day Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                    {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviousDay}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToday}
                        className="h-8 px-3"
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onNextDay}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Day Timeline */}
            <div className="p-4">
                <div className="space-y-4">
                    {hours.map((hour) => {
                        const hourEvents = eventsByHour[hour] || [];
                        const timeString = format(new Date().setHours(hour, 0, 0, 0), 'HH:mm');

                        return (
                            <div key={hour} className="flex gap-4">
                                {/* Time column */}
                                <div className="w-16 text-sm text-muted-foreground pt-2">
                                    {timeString}
                                </div>

                                {/* Events column */}
                                <div className="flex-1 min-h-[60px] border-l border-border/50 pl-4">
                                    {hourEvents.length > 0 ? (
                                        <div className="space-y-2">
                                            {hourEvents.map((event) => {
                                                const theme = getEventTheme(event.kind);
                                                const Icon = event.source === 'task' ? CheckSquare :
                                                    event.source === 'google' ? Calendar : Database;

                                                return (
                                                    <div
                                                        key={event.id}
                                                        className={cn(
                                                            "p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity",
                                                            tokenBg(theme.color),
                                                            tokenText(theme.color)
                                                        )}
                                                        onClick={() => onEventClick?.(event)}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium truncate">
                                                                    {event.title}
                                                                </div>
                                                                <div className="text-sm opacity-75 flex items-center gap-2 mt-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {format(new Date(event.start_at), 'HH:mm')} - {format(new Date(event.end_at), 'HH:mm')}
                                                                </div>
                                                                {event.description && (
                                                                    <div className="text-sm opacity-75 mt-1 line-clamp-2">
                                                                        {event.description}
                                                                    </div>
                                                                )}
                                                                {event.location && (
                                                                    <div className="text-sm opacity-75 mt-1">
                                                                        📍 {event.location}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-12 flex items-center">
                                            <div className="text-sm text-muted-foreground">
                                                No events
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

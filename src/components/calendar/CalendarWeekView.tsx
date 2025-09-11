import React from "react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MergedEvent } from "@/lib/calendar-utils";
import { getEventTheme, tokenBg, tokenText } from "./eventTheme";
import { CheckSquare, Calendar, Database } from "lucide-react";

interface CalendarWeekViewProps {
    currentDate: Date;
    events: MergedEvent[];
    onDateChange: (date: Date) => void;
    onPreviousWeek: () => void;
    onNextWeek: () => void;
    onToday: () => void;
    onEventClick?: (event: MergedEvent) => void;
    onDateClick?: (date: Date) => void;
}

export function CalendarWeekView({
    currentDate,
    events,
    onDateChange,
    onPreviousWeek,
    onNextWeek,
    onToday,
    onEventClick,
    onDateClick,
}: CalendarWeekViewProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weekDaysNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
        const eventDate = format(new Date(event.start_at), 'yyyy-MM-dd');
        if (!acc[eventDate]) {
            acc[eventDate] = [];
        }
        acc[eventDate].push(event);
        return acc;
    }, {} as Record<string, MergedEvent[]>);

    return (
        <div className="bg-card rounded-lg border shadow-sm">
            {/* Week Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviousWeek}
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
                        onClick={onNextWeek}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Week Grid */}
            <div className="p-4">
                <div className="grid grid-cols-7 gap-4">
                    {weekDays.map((day, index) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayEvents = eventsByDate[dayKey] || [];
                        const isCurrentDay = isToday(day);

                        return (
                            <div
                                key={dayKey}
                                className={cn(
                                    "min-h-[400px] border border-border/50 rounded-lg p-3 bg-background",
                                    isCurrentDay && "bg-primary/5 border-primary/50"
                                )}
                            >
                                {/* Day Header */}
                                <div className="mb-3">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        {weekDaysNames[index]}
                                    </div>
                                    <div
                                        className={cn(
                                            "text-lg font-semibold cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors",
                                            isCurrentDay && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center"
                                        )}
                                        onClick={() => onDateClick?.(day)}
                                    >
                                        {format(day, 'd')}
                                    </div>
                                </div>

                                {/* Events */}
                                <div className="space-y-2">
                                    {dayEvents.map((event) => {
                                        const theme = getEventTheme(event.kind);
                                        const Icon = event.source === 'task' ? CheckSquare :
                                            event.source === 'google' ? Calendar : Database;

                                        return (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    "text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity",
                                                    tokenBg(theme.color),
                                                    tokenText(theme.color)
                                                )}
                                                onClick={() => onEventClick?.(event)}
                                                title={event.title}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon className="h-3 w-3 flex-shrink-0" />
                                                    <span className="font-medium truncate">{event.title}</span>
                                                </div>
                                                <div className="text-xs opacity-75">
                                                    {format(new Date(event.start_at), 'HH:mm')}
                                                </div>
                                                {event.description && (
                                                    <div className="text-xs opacity-75 truncate mt-1">
                                                        {event.description}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

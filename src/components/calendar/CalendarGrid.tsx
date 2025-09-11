import React from "react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MergedEvent } from "@/lib/calendar-utils";
import { CalendarGridDay } from "./CalendarGridDay";

interface CalendarGridProps {
    currentDate: Date;
    events: MergedEvent[];
    onDateChange: (date: Date) => void;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onEventClick?: (event: MergedEvent) => void;
    onDateClick?: (date: Date) => void;
}

export function CalendarGrid({
    currentDate,
    events,
    onDateChange,
    onPreviousMonth,
    onNextMonth,
    onToday,
    onEventClick,
    onDateClick,
}: CalendarGridProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviousMonth}
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
                        onClick={onNextMonth}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-px mb-2">
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="text-center text-sm font-medium text-muted-foreground py-2"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-px">
                    {calendarDays.map((day) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayEvents = eventsByDate[dayKey] || [];
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isCurrentDay = isToday(day);

                        return (
                            <CalendarGridDay
                                key={dayKey}
                                date={day}
                                events={dayEvents}
                                isCurrentMonth={isCurrentMonth}
                                isToday={isCurrentDay}
                                onClick={() => onDateClick?.(day)}
                                onEventClick={onEventClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

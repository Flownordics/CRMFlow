import { Card } from "@/components/ui/card";
import { CalendarClock, AlarmClock, UserCheck, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, isToday, isThisWeek } from "date-fns";
import { MergedEvent } from "@/lib/calendar-utils";
import { useI18n } from "@/lib/i18n";

interface CalendarKpisProps {
    events: MergedEvent[];
    currentDate: Date;
    isConnected: boolean;
    connectedEmail?: string;
    eventsToday?: number;
    eventsThisWeek?: number;
}

export function CalendarKpis({
    events,
    currentDate,
    isConnected,
    connectedEmail,
    eventsToday,
    eventsThisWeek
}: CalendarKpisProps) {
    const { t } = useI18n();
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    // Use provided counts or calculate from events
    const todayCount = eventsToday ?? events.filter(event => {
        const eventDate = new Date(event.start_at);
        return isToday(eventDate);
    }).length;

    const weekCount = eventsThisWeek ?? events.filter(event => {
        const eventDate = new Date(event.start_at);
        return eventDate >= weekStart && eventDate <= weekEnd;
    }).length;

    const nextEvent = events
        .filter(event => new Date(event.start_at) > today)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Events Today */}
            <Card className="relative p-4 overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">{t('events_today')}</div>
                        <div className="text-2xl font-bold">{todayCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {t('events_this_week')}: {weekCount}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                </div>
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent"
                    aria-hidden="true"
                />
            </Card>

            {/* Connection Status */}
            <Card className="relative p-4 overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Connected as</div>
                        <div className="text-sm font-medium truncate max-w-[120px]">
                            {connectedEmail || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {isConnected ? "Active" : "Disconnected"}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-success/10">
                        <UserCheck className="h-4 w-4 text-success" aria-hidden="true" />
                    </div>
                </div>
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-success/5 to-transparent"
                    aria-hidden="true"
                />
            </Card>

            {/* Next Event */}
            <Card className="relative p-4 overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Next up</div>
                        <div className="text-sm font-medium truncate max-w-[120px]">
                            {nextEvent ? nextEvent.title : "No upcoming"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {nextEvent && !nextEvent.all_day
                                ? format(new Date(nextEvent.start_at), 'HH:mm')
                                : "All day"
                            }
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-warning/10">
                        <AlarmClock className="h-4 w-4 text-warning" aria-hidden="true" />
                    </div>
                </div>
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-warning/5 to-transparent"
                    aria-hidden="true"
                />
            </Card>

            {/* Week Overview */}
            <Card className="relative p-4 overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Week {format(weekStart, 'MMM dd')}</div>
                        <div className="text-2xl font-bold">{weekCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            to {format(weekEnd, 'MMM dd')}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-accent/10">
                        <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
                    </div>
                </div>
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent"
                    aria-hidden="true"
                />
            </Card>
        </div>
    );
}

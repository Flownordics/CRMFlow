import { CalendarClock, AlarmClock, UserCheck, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, isToday, isThisWeek } from "date-fns";
import { MergedEvent } from "@/lib/calendar-utils";
import { useI18n } from "@/lib/i18n";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

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
        <EnhancedKpiGrid columns={4}>
            <EnhancedKpiCard
                title={t('events_today')}
                value={todayCount}
                subtitle={`${t('events_this_week')}: ${weekCount}`}
                icon={CalendarClock}
            />

            <EnhancedKpiCard
                title="Connected as"
                value={connectedEmail ? connectedEmail.split('@')[0] : "Unknown"}
                subtitle={isConnected ? "Active" : "Disconnected"}
                icon={UserCheck}
                valueColor={isConnected ? "text-[#6b7c5e]" : "text-[#b8695f]"}
            />

            <EnhancedKpiCard
                title="Next Up"
                value={nextEvent ? nextEvent.title.slice(0, 20) : "No upcoming"}
                subtitle={
                    nextEvent && !nextEvent.all_day
                        ? format(new Date(nextEvent.start_at), 'HH:mm')
                        : nextEvent ? "All day" : ""
                }
                icon={AlarmClock}
            />

            <EnhancedKpiCard
                title={`Week ${format(weekStart, 'MMM dd')}`}
                value={weekCount}
                subtitle={`to ${format(weekEnd, 'MMM dd')}`}
                icon={TrendingUp}
            />
        </EnhancedKpiGrid>
    );
}

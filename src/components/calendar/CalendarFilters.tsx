import { cn } from "@/lib/utils";
import { Calendar, Users, Phone, Briefcase, Bell, Landmark, CalendarClock } from "lucide-react";
import { eventTypeTheme } from "./eventTheme";
import { useI18n } from "@/lib/i18n";

interface CalendarFiltersProps {
    selectedCalendar: string;
    selectedTypes: string[];
    onCalendarChange: (calendar: string) => void;
    onTypeToggle: (type: string) => void;
    availableCalendars: string[];
    showGoogleLayer?: boolean;
    isGoogleConnected?: boolean;
}

export function CalendarFilters({
    selectedCalendar,
    selectedTypes,
    onCalendarChange,
    onTypeToggle,
    availableCalendars,
    showGoogleLayer = false,
    isGoogleConnected = false
}: CalendarFiltersProps) {
    const { t } = useI18n();
    const eventTypes = Object.keys(eventTypeTheme);
    const typeIcons = {
        meeting: Users,
        call: Phone,
        focus: Briefcase,
        deadline: Bell,
        travel: Landmark,
        other: CalendarClock
    };

    return (
        <div className="space-y-4">
            {/* Calendar Selection */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Calendars</h3>
                <div className="flex flex-wrap gap-2">
                    {availableCalendars.map((calendar) => (
                        <button
                            key={calendar}
                            type="button"
                            onClick={() => onCalendarChange(calendar)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                                "bg-card hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selectedCalendar === calendar
                                    ? "ring-2 ring-primary/30 border-primary/50 bg-primary/5"
                                    : "border-border hover:border-border/60"
                            )}
                            role="button"
                            aria-pressed={selectedCalendar === calendar}
                        >
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            {calendar === 'primary' ? 'My Calendar' : calendar}
                        </button>
                    ))}
                </div>
            </div>

            {/* Google Layer Status */}
            {isGoogleConnected && (
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Google Calendar</h3>
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                            <div className="text-xs font-medium">
                                {showGoogleLayer ? t('event_source_google') : t('event_source_native')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {showGoogleLayer ? 'Google events visible' : 'Native events only'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Type Filters */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Event Types</h3>
                <div className="flex flex-wrap gap-2">
                    {eventTypes.map((type) => {
                        const Icon = typeIcons[type as keyof typeof typeIcons];
                        const isSelected = selectedTypes.includes(type);

                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => onTypeToggle(type)}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                                    "bg-card hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                    isSelected
                                        ? "ring-2 ring-primary/30 border-primary/50 bg-primary/5"
                                        : "border-border hover:border-border/60"
                                )}
                                role="button"
                                aria-pressed={isSelected}
                            >
                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                {t(type as keyof typeof t)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {selectedTypes.length > 0
                            ? `Showing ${selectedTypes.length} event types`
                            : "Showing all event types"
                        }
                    </span>
                    {selectedTypes.length > 0 && (
                        <button
                            type="button"
                            onClick={() => selectedTypes.forEach(type => onTypeToggle(type))}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

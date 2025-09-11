import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, CalendarDays, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

type CalendarView = 'list' | 'month' | 'week' | 'day';

interface CalendarToolbarProps {
    currentDate: Date;
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
}

export function CalendarToolbar({
    currentDate,
    view,
    onViewChange,
    onPrevious,
    onNext,
    onToday
}: CalendarToolbarProps) {
    const getVisibleRangeLabel = () => {
        switch (view) {
            case 'list':
                return 'All Events';
            case 'month':
                return format(currentDate, 'MMMM yyyy');
            case 'week':
                const weekStart = startOfWeek(currentDate);
                const weekEnd = endOfWeek(currentDate);
                return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
            case 'day':
                return format(currentDate, 'EEEE, MMMM dd, yyyy');
            default:
                return format(currentDate, 'MMMM yyyy');
        }
    };

    const getViewButtonVariant = (buttonView: CalendarView) => {
        return view === buttonView ? "default" : "outline";
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3 shadow-card">
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    aria-label="Previous period"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToday}
                    aria-label="Go to today"
                >
                    Today
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNext}
                    aria-label="Next period"
                >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>

            <div className="text-sm font-medium text-muted-foreground">
                {getVisibleRangeLabel()}
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant={getViewButtonVariant('list')}
                    size="sm"
                    onClick={() => onViewChange('list')}
                    aria-pressed={view === 'list'}
                >
                    <List className="h-4 w-4 mr-1" />
                    List
                </Button>
                <Button
                    variant={getViewButtonVariant('month')}
                    size="sm"
                    onClick={() => onViewChange('month')}
                    aria-pressed={view === 'month'}
                >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Month
                </Button>
                <Button
                    variant={getViewButtonVariant('week')}
                    size="sm"
                    onClick={() => onViewChange('week')}
                    aria-pressed={view === 'week'}
                >
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Week
                </Button>
                <Button
                    variant={getViewButtonVariant('day')}
                    size="sm"
                    onClick={() => onViewChange('day')}
                    aria-pressed={view === 'day'}
                >
                    <Clock className="h-4 w-4 mr-1" />
                    Day
                </Button>
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useEvents, useCreateEvent } from "@/services/events";
import { useCalendarEvents, useCalendarConnection, useSetupCalendarSync } from "@/services/calendar";
import { useUserSettings, useUpdateUserSettings } from "@/services/settings";
import { useTasks } from "@/services/tasks";
import { useQuery } from "@tanstack/react-query";
import {
  CreateEventDialog,
  CalendarKpis,
  CalendarToolbar,
  EventItem,
  CalendarFilters,
  CalendarEmpty,
  CalendarLoadingState,
  CalendarGrid,
  CalendarWeekView,
  CalendarDayView
} from "@/components/calendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { filterEventsByKind, getEventsForToday, getEventsForThisWeek, nativeEventToMerged, googleEventToMerged, mergeEvents } from "@/lib/calendar-utils";
import { useI18n } from "@/lib/i18n";
import { toastBus } from "@/lib/toastBus";

type CalendarView = 'list' | 'month' | 'week' | 'day';

export default function CalendarView() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // User settings for calendar preferences
  const { data: userSettings } = useUserSettings();
  const updateUserSettings = useUpdateUserSettings();

  // Check Google Calendar connection status
  const { data: calendarConnection, isLoading: connectionLoading } = useCalendarConnection();
  const isGoogleConnected = calendarConnection?.connected || false;

  // Set up calendar sync
  const setupCalendarSync = useSetupCalendarSync();

  // Native events
  const { data: nativeEvents, isLoading: nativeEventsLoading, refetch: refetchNativeEvents } = useEvents({
    from: getDateRangeStart(currentDate, view).toISOString(),
    to: getDateRangeEnd(currentDate, view).toISOString(),
    kinds: selectedTypes.length > 0 ? selectedTypes.filter(kind => kind !== 'task') : undefined,
  });

  // Tasks with due dates in the current range
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks({
    due_date_from: getDateRangeStart(currentDate, view).toISOString(),
    due_date_to: getDateRangeEnd(currentDate, view).toISOString(),
  });

  // Google Calendar events - only fetch if connected and not in localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const { data: googleEvents, isLoading: googleEventsLoading, refetch: refetchGoogleEvents } = useQuery({
    queryKey: ['calendarEvents', getDateRangeStart(currentDate, view).toISOString(), getDateRangeEnd(currentDate, view).toISOString()],
    queryFn: async () => {
      if (!isGoogleConnected || isLocalhost) return [];
      const { listEvents } = await import('@/services/calendar');
      return listEvents({
        start: getDateRangeStart(currentDate, view).toISOString(),
        end: getDateRangeEnd(currentDate, view).toISOString(),
      });
    },
    enabled: isGoogleConnected && !isLocalhost,
    retry: 1,
  });

  // Event creation hooks
  const createNativeEvent = useCreateEvent();

  // Set up calendar sync when Google Calendar is connected (but not in localhost)
  useEffect(() => {
    if (isGoogleConnected && !isLocalhost && !setupCalendarSync.isPending) {
      setupCalendarSync.mutate();
    }
  }, [isGoogleConnected, isLocalhost]); // Removed setupCalendarSync from dependencies to prevent loop

  // Fetch events when date/view changes
  useEffect(() => {
    refetchNativeEvents();
    refetchTasks();
  }, [currentDate, view, selectedTypes, refetchNativeEvents, refetchTasks]);

  // Helper functions for date ranges
  function getDateRangeStart(date: Date, view: CalendarView): Date {
    switch (view) {
      case 'month':
        return startOfMonth(date);
      case 'week':
        return startOfWeek(date, { weekStartsOn: 1 });
      case 'day':
        return startOfDay(date);
      default:
        return startOfMonth(date);
    }
  }

  function getDateRangeEnd(date: Date, view: CalendarView): Date {
    switch (view) {
      case 'month':
        return endOfMonth(date);
      case 'week':
        return endOfWeek(date, { weekStartsOn: 1 });
      case 'day':
        return endOfDay(date);
      default:
        return endOfMonth(date);
    }
  }

  // Handle event creation
  const handleCreateEvent = async () => {
    try {
      setShowCreateDialog(false);
      refetchNativeEvents();
      toastBus.emit({
        title: "Success",
        description: 'Event created successfully',
        variant: "success"
      });
    } catch (error) {
      console.error('Failed to create event:', error);
      toastBus.emit({
        title: "Error",
        description: 'Failed to create event',
        variant: "destructive"
      });
    }
  };

  // Handle date navigation
  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  // Handle view change
  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
  };

  // Navigation handlers for grid views
  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handlePreviousWeek = () => {
    setCurrentDate(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handlePreviousDay = () => {
    setCurrentDate(prev => new Date(prev.getTime() - 24 * 60 * 60 * 1000));
  };

  const handleNextDay = () => {
    setCurrentDate(prev => new Date(prev.getTime() + 24 * 60 * 60 * 1000));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    if (view === 'month') {
      setView('day');
    }
  };

  const handleEventClick = (event: MergedEvent) => {
    // Handle event click - could open event details or navigate
    console.log('Event clicked:', event);
  };

  // Handle type filtering
  const handleTypeFilterChange = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Loading state
  const isLoading = nativeEventsLoading || tasksLoading || connectionLoading || (isGoogleConnected && !isLocalhost && googleEventsLoading);

  if (isLoading) {
    return <CalendarLoadingState />;
  }

  // Merge native events, Google Calendar events, and tasks
  const allEvents = mergeEvents(nativeEvents || [], googleEvents || [], tasks || []);

  // Filter events by selected types
  const filteredEvents = selectedTypes.length > 0
    ? filterEventsByKind(allEvents, selectedTypes)
    : allEvents;

  // Get events for different views
  const todayEvents = getEventsForToday(filteredEvents);
  const weekEvents = getEventsForThisWeek(filteredEvents);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('calendar')}
        subtitle={t('calendar_description')}
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('create_event')}
          </Button>
        }
      />

      {/* Calendar KPIs */}
      <CalendarKpis
        events={filteredEvents}
        currentDate={currentDate}
        isConnected={isGoogleConnected && !isLocalhost}
        eventsToday={todayEvents.length}
        eventsThisWeek={weekEvents.length}
      />

      {/* Localhost Notice */}
      {isLocalhost && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="text-yellow-600">⚠️</div>
            <div className="text-sm text-yellow-800">
              <strong>Development Mode:</strong> Google Calendar integration is disabled in localhost.
              Deploy to Netlify to test Google Calendar features.
            </div>
          </div>
        </div>
      )}

      {/* Calendar Toolbar */}
      <CalendarToolbar
        currentDate={currentDate}
        view={view}
        onViewChange={handleViewChange}
        onPrevious={() => {
          if (view === 'month') handlePreviousMonth();
          else if (view === 'week') handlePreviousWeek();
          else if (view === 'day') handlePreviousDay();
          else handleDateChange(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
        }}
        onNext={() => {
          if (view === 'month') handleNextMonth();
          else if (view === 'week') handleNextWeek();
          else if (view === 'day') handleNextDay();
          else handleDateChange(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
        }}
        onToday={handleToday}
      />

      {/* Calendar Filters */}
      <CalendarFilters
        selectedCalendar={selectedCalendar}
        selectedTypes={selectedTypes}
        onCalendarChange={setSelectedCalendar}
        onTypeToggle={handleTypeFilterChange}
        availableCalendars={['primary']}
        showGoogleLayer={!isLocalhost}
        isGoogleConnected={isGoogleConnected && !isLocalhost}
      />

      {/* Calendar Content */}
      <div className="space-y-4">
        {view === 'list' ? (
          // List view (original)
          filteredEvents.length === 0 ? (
            <CalendarEmpty
              isConnected={isGoogleConnected}
              isLoading={false}
              onCreateEvent={() => setShowCreateDialog(true)}
              onGoToSettings={() => { }}
            />
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  onEventUpdated={() => {
                    refetchNativeEvents();
                    refetchGoogleEvents();
                    refetchTasks();
                  }}
                />
              ))}
            </div>
          )
        ) : view === 'month' ? (
          // Month grid view
          <CalendarGrid
            currentDate={currentDate}
            events={filteredEvents}
            onDateChange={handleDateChange}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
          />
        ) : view === 'week' ? (
          // Week view
          <CalendarWeekView
            currentDate={currentDate}
            events={filteredEvents}
            onDateChange={handleDateChange}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onToday={handleToday}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
          />
        ) : view === 'day' ? (
          // Day view
          <CalendarDayView
            currentDate={currentDate}
            events={filteredEvents}
            onDateChange={handleDateChange}
            onPreviousDay={handlePreviousDay}
            onNextDay={handleNextDay}
            onToday={handleToday}
            onEventClick={handleEventClick}
          />
        ) : null}
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onEventCreated={handleCreateEvent}
        showGoogleLayer={!isLocalhost}
        isGoogleConnected={isGoogleConnected && !isLocalhost}
      />
    </div>
  );
}

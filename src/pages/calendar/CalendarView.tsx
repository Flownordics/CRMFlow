import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCalendarConnection, useCalendarEvents, useCreateCalendarEvent, getCalendarStatus, syncGoogleCalendar } from "@/services/calendar";
import { useEvents, useCreateEvent } from "@/services/events";
import { useUserSettings, useUpdateUserSettings } from "@/services/settings";
import { useQuery } from "@tanstack/react-query";
import {
  CreateEventDialog,
  CalendarKpis,
  CalendarToolbar,
  EventItem,
  CalendarFilters,
  CalendarEmpty,
  CalendarLoadingState
} from "@/components/calendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { mergeEvents, filterEventsByKind, getEventsForToday, getEventsForThisWeek } from "@/lib/calendar-utils";
import { useI18n } from "@/lib/i18n";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { toastBus } from "@/lib/toastBus";

type CalendarView = 'month' | 'week' | 'day';

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

  // State for Google layer toggle
  const [showGoogleLayer, setShowGoogleLayer] = useState(userSettings?.calendar_show_google ?? false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Update showGoogleLayer when userSettings change
  useEffect(() => {
    if (userSettings) {
      setShowGoogleLayer(userSettings.calendar_show_google);
    }
  }, [userSettings]);

  // Calendar status query
  const { data: calStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["calendarStatus"],
    queryFn: getCalendarStatus,
    staleTime: 60_000,
  });

  // Google Calendar integration
  const { data: calendarInfo, isLoading: connectionLoading } = useCalendarConnection();
  const { data: googleEvents, isLoading: googleEventsLoading, refetch: refetchGoogleEvents } = useCalendarEvents({
    start: getDateRangeStart(currentDate, view).toISOString(),
    end: getDateRangeEnd(currentDate, view).toISOString()
  });

  // Native events
  const { data: nativeEvents, isLoading: nativeEventsLoading, refetch: refetchNativeEvents } = useEvents({
    from: getDateRangeStart(currentDate, view).toISOString(),
    to: getDateRangeEnd(currentDate, view).toISOString(),
    kinds: selectedTypes.length > 0 ? selectedTypes : undefined,
  });

  // Event creation hooks
  const createGoogleEvent = useCreateCalendarEvent();
  const createNativeEvent = useCreateEvent();

  // Fetch events when date/view changes
  useEffect(() => {
    refetchNativeEvents();
    if (showGoogleLayer && calendarInfo?.connected) {
      refetchGoogleEvents();
    }
  }, [currentDate, view, selectedTypes, showGoogleLayer, calendarInfo?.connected, refetchNativeEvents, refetchGoogleEvents]);

  // Merge events
  const mergedEvents = mergeEvents(
    nativeEvents || [],
    (showGoogleLayer && googleEvents) ? googleEvents : []
  );

  // Filter merged events by selected types
  const filteredEvents = filterEventsByKind(mergedEvents, selectedTypes);

  const handlePrevious = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'month':
          newDate.setMonth(prev.getMonth() - 1);
          break;
        case 'week':
          newDate.setDate(prev.getDate() - 7);
          break;
        case 'day':
          newDate.setDate(prev.getDate() - 1);
          break;
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'month':
          newDate.setMonth(prev.getMonth() + 1);
          break;
        case 'week':
          newDate.setDate(prev.getDate() + 7);
          break;
        case 'day':
          newDate.setDate(prev.getDate() + 1);
          break;
      }
      return newDate;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    // Adjust current date to ensure it's within the new view range
    const today = new Date();
    if (view === 'month' && newView === 'week') {
      setCurrentDate(startOfWeek(today));
    } else if (view === 'month' && newView === 'day') {
      setCurrentDate(today);
    } else if (view === 'week' && newView === 'day') {
      setCurrentDate(today);
    }
  };

  const handleCreateEvent = () => {
    setShowCreateDialog(true);
  };

  const handleEventCreated = () => {
    setShowCreateDialog(false);
    refetchNativeEvents();
    if (showGoogleLayer && calendarInfo?.connected) {
      refetchGoogleEvents();
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGoogleLayerToggle = async () => {
    const newValue = !showGoogleLayer;
    setShowGoogleLayer(newValue);

    // Update user settings
    try {
      await updateUserSettings.mutateAsync({
        calendar_show_google: newValue
      });
    } catch (error) {
      console.error('Failed to update Google layer setting:', error);
    }
  };

  const isLoading = connectionLoading || nativeEventsLoading || (showGoogleLayer && googleEventsLoading);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <CalendarLoadingState />
      </div>
    );
  }

  // Calculate KPIs
  const eventsToday = getEventsForToday(mergedEvents);
  const eventsThisWeek = getEventsForThisWeek(mergedEvents);

  return (
    <div className="space-y-6 p-6" data-testid="calendar-view">
      {/* Page Header */}
      <PageHeader
        title="Calendar"
        subtitle={t('your_calendar')}
        actions={
          <Button onClick={handleCreateEvent} className="flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('create_event')}
          </Button>
        }
      />

      {/* Gradient Divider */}
      <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />

      {/* KPI Cards */}
      <CalendarKpis
        events={mergedEvents}
        currentDate={currentDate}
        isConnected={calendarInfo?.connected ?? false}
        connectedEmail={calendarInfo?.email}
        eventsToday={eventsToday.length}
        eventsThisWeek={eventsThisWeek.length}
      />

      {/* Calendar Toolbar */}
      <CalendarToolbar
        currentDate={currentDate}
        view={view}
        onViewChange={handleViewChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
      />

      {/* Google Calendar Status */}
      {statusLoading ? (
        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
          {t('checking_google_calendar') || "Checking Google Calendar…"}
        </div>
      ) : calStatus?.connected ? (
        <div className="flex items-center gap-2 rounded-lg border p-3 bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
          <span className="text-sm font-medium text-success">
            {t('connected_to_google_calendar') || "Connected to Google Calendar"} ({calStatus.email})
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/settings?tab=integrations"}
              aria-label={t('manage') || "Manage integration"}
            >
              {t('manage') || "Manage"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                setSyncLoading(true);
                const r = await syncGoogleCalendar();
                setSyncLoading(false);
                if (r.ok) {
                  toastBus.emit({
                    title: t('calendar_synced') || "Calendar synced",
                    variant: "success"
                  });
                } else {
                  toastBus.emit({
                    title: t('sync_failed') || "Sync failed",
                    description: r.error,
                    variant: "destructive"
                  });
                }
                refetchStatus();
              }}
              aria-busy={syncLoading}
            >
              {syncLoading ? (t('syncing') || "Syncing…") : (t('sync_now') || "Sync now")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border p-3 bg-warning/10">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">{t('google_calendar_not_connected') || "Google Calendar not connected"}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings?tab=integrations"}>
            {t('connect') || "Connect"}
          </Button>
        </div>
      )}

      {/* Google Layer Toggle */}
      {calStatus?.connected && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('show_google_events')}</span>
            <Button
              variant={showGoogleLayer ? "default" : "outline"}
              size="sm"
              onClick={handleGoogleLayerToggle}
              disabled={updateUserSettings.isPending}
            >
              {showGoogleLayer ? "On" : "Off"}
            </Button>
          </div>
        </div>
      )}

      {/* Filters and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <CalendarFilters
            selectedCalendar={selectedCalendar}
            selectedTypes={selectedTypes}
            onCalendarChange={setSelectedCalendar}
            onTypeToggle={handleTypeToggle}
            availableCalendars={['primary']}
            showGoogleLayer={showGoogleLayer}
            isGoogleConnected={calendarInfo?.connected ?? false}
          />
        </div>

        {/* Events List */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <CalendarLoadingState />
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchNativeEvents();
                    if (showGoogleLayer && calendarInfo?.connected) {
                      refetchGoogleEvents();
                    }
                  }}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>

              <div className="grid gap-4">
                {filteredEvents.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </div>
            </div>
          ) : (
            <CalendarEmpty
              isConnected={calendarInfo?.connected ?? false}
              isLoading={false}
              onCreateEvent={handleCreateEvent}
              onGoToSettings={() => window.location.href = '/settings'}
              showGoogleLayer={showGoogleLayer}
            />
          )}
        </div>
      </div>

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onEventCreated={handleEventCreated}
        showGoogleLayer={showGoogleLayer}
        isGoogleConnected={calendarInfo?.connected ?? false}
      />
    </div>
  );
}

// Helper functions
function getDateRangeStart(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'month':
      return startOfMonth(date);
    case 'week':
      return startOfWeek(date);
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
      return endOfWeek(date);
    case 'day':
      return endOfDay(date);
    default:
      return endOfMonth(date);
  }
}

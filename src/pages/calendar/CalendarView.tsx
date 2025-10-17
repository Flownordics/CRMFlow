import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, CheckSquare } from "lucide-react";
import { useEvents } from "@/services/events";
import { useCalendarConnection, useSetupCalendarSync } from "@/services/calendar";
import { useTasks } from "@/services/tasks";
import { useQuery } from "@tanstack/react-query";
import {
  CreateEventDialog,
  EditEventDialog,
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
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { filterEventsByKind, getEventsForToday, getEventsForThisWeek, mergeEvents, type MergedEvent } from "@/lib/calendar-utils";
import { toastBus } from "@/lib/toastBus";
import { logger } from '@/lib/logger';

// Import Tasks page components
import TasksView from "@/pages/Tasks";
import { TaskForm } from "@/components/tasks/TaskForm";

type CalendarView = 'list' | 'month' | 'week' | 'day';

export default function CalendarView() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MergedEvent | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

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
      logger.error('Failed to create event:', error);
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
    // Only allow editing of native events
    if (event.source === 'native') {
      setSelectedEvent(event);
      setShowEditDialog(true);
    } else {
      // For Google-only events, show info toast
      toastBus.emit({
        title: "Google Calendar Event",
        description: "This event can only be edited in Google Calendar",
        variant: "default"
      });
    }
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

  // Handle create button click based on active tab
  const handleCreateClick = () => {
    if (activeTab === 'calendar') {
      setShowCreateDialog(true);
    } else {
      setShowTaskForm(true);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={activeTab === 'calendar' ? 'Calendar' : 'Tasks'}
        subtitle={activeTab === 'calendar' ? 'Your events, meetings and tasks in one place' : 'Manage your tasks and calendar events'}
        actions={
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'calendar' ? 'Create Event' : 'New Task'}
          </Button>
        }
      />

      {/* Tabs for switching between Calendar and Tasks */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'calendar' | 'tasks')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab Content */}
        <TabsContent value="calendar" className="space-y-6 mt-6">

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
        <div className="bg-[#faf5ef] border border-[#e8dac8] rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="text-[#9d855e]">⚠️</div>
            <div className="text-sm text-[#7d6a4a]">
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

      {/* Edit Event Dialog */}
      {selectedEvent && selectedEvent.source === 'native' && (
        <EditEventDialog
          event={selectedEvent}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onEventUpdated={() => {
            refetchNativeEvents();
            refetchGoogleEvents();
            refetchTasks();
          }}
        />
      )}
        </TabsContent>

        {/* Tasks Tab Content */}
        <TabsContent value="tasks" className="mt-6">
          <TasksView embedded={true} />
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog (for creating/editing tasks from Calendar view) */}
      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
      />
    </div>
  );
}

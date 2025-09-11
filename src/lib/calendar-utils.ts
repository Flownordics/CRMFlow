import { EventRow } from "@/services/events";
import { GoogleCalendarEvent } from "@/services/calendar";
import { Task } from "@/services/tasks";

export interface MergedEvent {
    id: string;
    title: string;
    description?: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
    location?: string;
    attendees: Array<{
        email: string;
        name: string;
        optional: boolean;
    }>;
    color?: string;
    kind?: string;
    source: 'native' | 'google' | 'task';
    // CRM links (only for native events)
    deal_id?: string;
    company_id?: string;
    quote_id?: string;
    order_id?: string;
    // Task links (only for task events)
    task_id?: string;
    task_status?: string;
    task_priority?: string;
    // Original event data
    nativeEvent?: EventRow;
    googleEvent?: GoogleCalendarEvent;
    taskEvent?: Task;
}

/**
 * Convert native event to merged event format
 */
export function nativeEventToMerged(event: EventRow): MergedEvent {
    return {
        id: event.id,
        title: event.title,
        description: event.description || undefined,
        start_at: event.start_at,
        end_at: event.end_at,
        all_day: event.all_day,
        location: event.location || undefined,
        attendees: event.attendees,
        color: event.color || undefined,
        kind: event.kind || undefined,
        source: 'native',
        deal_id: event.deal_id || undefined,
        company_id: event.company_id || undefined,
        quote_id: event.quote_id || undefined,
        order_id: event.order_id || undefined,
        nativeEvent: event,
    };
}

/**
 * Convert Google event to merged event format
 */
export function googleEventToMerged(event: GoogleCalendarEvent): MergedEvent {
    const startAt = event.start.dateTime || event.start.date;
    const endAt = event.end.dateTime || event.end.date;
    const allDay = !event.start.dateTime;

    return {
        id: event.id || `google-${Date.now()}-${Math.random()}`,
        title: event.summary,
        description: event.description,
        start_at: startAt || new Date().toISOString(),
        end_at: endAt || new Date().toISOString(),
        all_day: allDay,
        location: event.location,
        attendees: event.attendees?.map(att => ({
            email: att.email,
            name: att.displayName || att.email,
            optional: att.responseStatus === 'needsAction'
        })) || [],
        color: inferColorFromGoogleEvent(event),
        kind: inferKindFromGoogleEvent(event),
        source: 'google',
        googleEvent: event,
    };
}

/**
 * Convert task to merged event format
 */
export function taskToMerged(task: Task): MergedEvent {
    if (!task.due_date) {
        throw new Error('Task must have a due date to be converted to calendar event');
    }

    const dueDate = new Date(task.due_date);
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
        id: `task-${task.id}`,
        title: task.title,
        description: task.description,
        start_at: dueDate.toISOString(),
        end_at: endDate.toISOString(),
        all_day: false,
        location: undefined,
        attendees: [],
        color: getTaskColor(task),
        kind: 'task',
        source: 'task',
        task_id: task.id,
        task_status: task.status,
        task_priority: task.priority,
        taskEvent: task,
    };
}

/**
 * Get color for task based on priority and status
 */
function getTaskColor(task: Task): string {
    if (task.status === 'completed') {
        return 'success';
    }
    if (task.status === 'cancelled') {
        return 'muted';
    }

    switch (task.priority) {
        case 'urgent':
            return 'danger';
        case 'high':
            return 'warning';
        case 'medium':
            return 'primary';
        case 'low':
            return 'accent';
        default:
            return 'primary';
    }
}

/**
 * Merge native events, Google events, and tasks, sorted by start time
 */
export function mergeEvents(nativeEvents: EventRow[], googleEvents: GoogleCalendarEvent[], tasks: Task[] = []): MergedEvent[] {
    const nativeMerged = nativeEvents.map(nativeEventToMerged);
    const googleMerged = googleEvents.map(googleEventToMerged);

    // Convert tasks with due dates to events
    const taskMerged = tasks
        .filter(task => task.due_date)
        .map(taskToMerged);

    const allEvents = [...nativeMerged, ...googleMerged, ...taskMerged];

    // Sort by start time
    return allEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

/**
 * Infer color from Google event (based on extended properties or default)
 */
function inferColorFromGoogleEvent(event: GoogleCalendarEvent): string {
    // Check if there's a CRMFlow color in extended properties
    const crmflowColor = (event.extendedProperties?.private as any)?.crmflowColor;
    if (crmflowColor) {
        return crmflowColor;
    }

    // Default color based on event type
    const kind = inferKindFromGoogleEvent(event);
    switch (kind) {
        case 'meeting':
            return 'primary';
        case 'call':
            return 'accent';
        case 'deadline':
            return 'warning';
        default:
            return 'muted';
    }
}

/**
 * Infer kind from Google event (based on extended properties or title)
 */
function inferKindFromGoogleEvent(event: GoogleCalendarEvent): string {
    // Check if there's a CRMFlow kind in extended properties
    const crmflowKind = event.extendedProperties?.private?.crmflowKind;
    if (crmflowKind) {
        return crmflowKind;
    }

    // Infer from title
    const lowerTitle = event.summary.toLowerCase();

    if (lowerTitle.includes('meeting') || lowerTitle.includes('møde')) return 'meeting';
    if (lowerTitle.includes('call') || lowerTitle.includes('opkald')) return 'call';
    if (lowerTitle.includes('deadline') || lowerTitle.includes('deadline')) return 'deadline';
    if (lowerTitle.includes('focus') || lowerTitle.includes('fokus')) return 'focus';
    if (lowerTitle.includes('travel') || lowerTitle.includes('rejse')) return 'travel';

    return 'other';
}

/**
 * Filter events by kind
 */
export function filterEventsByKind(events: MergedEvent[], kinds: string[]): MergedEvent[] {
    if (kinds.length === 0) return events;

    return events.filter(event => {
        if (!event.kind) return false;
        return kinds.includes(event.kind);
    });
}

/**
 * Get events for today
 */
export function getEventsForToday(events: MergedEvent[]): MergedEvent[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return events.filter(event => {
        const eventStart = new Date(event.start_at);
        return eventStart >= startOfDay && eventStart <= endOfDay;
    });
}

/**
 * Get events for this week
 */
export function getEventsForThisWeek(events: MergedEvent[]): MergedEvent[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    return events.filter(event => {
        const eventStart = new Date(event.start_at);
        return eventStart >= startOfWeek && eventStart <= endOfWeek;
    });
}

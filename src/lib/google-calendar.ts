import { apiClient } from "./api";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getUserIntegrations, refreshGoogleTokenIfNeeded } from "@/services/integrations";

// Calendar Event schemas
export const CalendarEvent = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.array(z.string()).optional(),
});

export const GoogleCalendarEvent = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
  }),
  attendees: z.array(z.object({
    email: z.string(),
    responseStatus: z.string().optional(),
  })).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
});

export type CalendarEvent = z.infer<typeof CalendarEvent>;
export type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEvent>;

// Deal Calendar Event schemas
export const DealCalendarEvent = z.object({
  deal_id: z.string().uuid(),
  title: z.string(),
  close_date: z.string(), // ISO date string
  owner_user_id: z.string().uuid(),
  company_name: z.string().optional(),
  expected_value: z.number().optional(),
});

export type DealCalendarEvent = z.infer<typeof DealCalendarEvent>;

/**
 * Get Google Calendar access token for a user
 */
async function getGoogleCalendarToken(userId: string): Promise<string | null> {
  try {
    const integrations = await getUserIntegrations();
    const calendarIntegration = integrations.find(i =>
      i.userId === userId && i.kind === 'calendar' && i.provider === 'google'
    );

    if (!calendarIntegration) {
      return null;
    }

    // Refresh token if needed
    await refreshGoogleTokenIfNeeded('calendar');

    return calendarIntegration.accessToken;
  } catch (error) {
    console.error("Failed to get Google Calendar token:", error);
    return null;
  }
}

/**
 * Create or update a Google Calendar event for a deal close date
 */
export async function syncDealToCalendar(dealEvent: DealCalendarEvent): Promise<string | null> {
  try {
    const token = await getGoogleCalendarToken(dealEvent.owner_user_id);
    if (!token) {
      console.log("No Google Calendar integration found for user:", dealEvent.owner_user_id);
      return null;
    }

    // Check if event already exists
    const existingEventId = await getExistingCalendarEventId(dealEvent.deal_id);

    // Prepare event data
    const eventData = {
      summary: `Deal Close: ${dealEvent.title}`,
      description: `Deal: ${dealEvent.title}${dealEvent.company_name ? `\nCompany: ${dealEvent.company_name}` : ''}${dealEvent.expected_value ? `\nValue: ${dealEvent.expected_value}` : ''}`,
      start: {
        date: dealEvent.close_date, // All-day event
      },
      end: {
        date: dealEvent.close_date, // All-day event
      },
    };

    let eventId: string;

    if (existingEventId) {
      // Update existing event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update calendar event: ${response.statusText}`);
      }

      const updatedEvent = await response.json();
      eventId = updatedEvent.id;
    } else {
      // Create new event
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create calendar event: ${response.statusText}`);
      }

      const newEvent = await response.json();
      eventId = newEvent.id;
    }

    // Store the event ID in deal_integrations
    await storeCalendarEventId(dealEvent.deal_id, eventId);

    return eventId;
  } catch (error) {
    console.error("Failed to sync deal to calendar:", error);
    throw error;
  }
}

/**
 * Remove a deal's calendar event
 */
export async function removeDealFromCalendar(dealId: string, userId: string): Promise<void> {
  try {
    const token = await getGoogleCalendarToken(userId);
    if (!token) {
      return; // No integration, nothing to remove
    }

    const existingEventId = await getExistingCalendarEventId(dealId);
    if (!existingEventId) {
      return; // No event to remove
    }

    // Delete from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete calendar event: ${response.statusText}`);
    }

    // Remove from deal_integrations
    await removeCalendarEventId(dealId);
  } catch (error) {
    console.error("Failed to remove deal from calendar:", error);
    throw error;
  }
}

/**
 * Get existing calendar event ID for a deal
 */
async function getExistingCalendarEventId(dealId: string): Promise<string | null> {
  try {
    const response = await apiClient.get(
      `/deal_integrations?deal_id=eq.${dealId}&provider=eq.google&kind=eq.calendar&select=external_id`
    );

    const data = response.data;
    if (Array.isArray(data) && data.length > 0) {
      return data[0].external_id;
    }

    return null;
  } catch (error) {
    console.error("Failed to get existing calendar event ID:", error);
    return null;
  }
}

/**
 * Store calendar event ID in deal_integrations
 */
async function storeCalendarEventId(dealId: string, eventId: string): Promise<void> {
  try {
    await apiClient.post('/deal_integrations', {
      deal_id: dealId,
      provider: 'google',
      kind: 'calendar',
      external_id: eventId,
      metadata: {
        synced_at: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Failed to store calendar event ID:", error);
    throw error;
  }
}

/**
 * Remove calendar event ID from deal_integrations
 */
async function removeCalendarEventId(dealId: string): Promise<void> {
  try {
    await apiClient.delete(
      `/deal_integrations?deal_id=eq.${dealId}&provider=eq.google&kind=eq.calendar`
    );
  } catch (error) {
    console.error("Failed to remove calendar event ID:", error);
    throw error;
  }
}

/**
 * List calendar events (legacy function - kept for compatibility)
 */
export async function listCalendarEvents(range: { from: string; to: string }) {
  const res = await apiClient.get(
    `/calendar/events`,
    z.object({
      data: z.array(CalendarEvent),
    }),
  );
  return res.data;
}

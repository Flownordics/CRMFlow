/**
 * Two-Way Calendar Sync Service
 * Sets up and manages Google Calendar push notifications for real-time sync
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

export interface CalendarSyncStatus {
  enabled: boolean;
  resourceId?: string;
  channelId?: string;
  expiresAt?: string;
  lastSyncAt?: string;
}

/**
 * Get current sync status for user
 */
export async function getCalendarSyncStatus(): Promise<CalendarSyncStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { enabled: false };
    }

    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('resource_id, channel_id, webhook_expiration, updated_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'calendar')
      .single();

    if (error || !integration) {
      return { enabled: false };
    }

    return {
      enabled: !!integration.resource_id && !!integration.channel_id,
      resourceId: integration.resource_id,
      channelId: integration.channel_id,
      expiresAt: integration.webhook_expiration,
      lastSyncAt: integration.updated_at,
    };
  } catch (error) {
    logger.error('Failed to get calendar sync status:', error);
    return { enabled: false };
  }
}

/**
 * Enable two-way sync by setting up Google Calendar push notifications
 */
export async function enableCalendarSync(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'calendar')
      .single();

    if (integrationError || !integration) {
      return { success: false, error: 'Calendar not connected' };
    }

    // Generate unique channel ID
    const channelId = `crmflow-calendar-${user.id}-${Date.now()}`;
    
    // Get the webhook URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return { success: false, error: 'Supabase URL not configured' };
    }
    
    const webhookUrl = `${supabaseUrl}/functions/v1/google-calendar-webhook`;

    // Set up push notification via Google Calendar API
    const watchResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        }),
      }
    );

    if (!watchResponse.ok) {
      const errorText = await watchResponse.text();
      logger.error('Failed to set up Google Calendar watch:', errorText);
      return { success: false, error: 'Failed to set up calendar sync' };
    }

    const watchData = await watchResponse.json();

    // Store the resource ID and channel ID in user_integrations
    const { error: updateError } = await supabase
      .from('user_integrations')
      .update({
        resource_id: watchData.resourceId,
        channel_id: channelId,
        webhook_expiration: new Date(parseInt(watchData.expiration)).toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'calendar');

    if (updateError) {
      logger.error('Failed to update integration with sync info:', updateError);
      return { success: false, error: 'Failed to save sync configuration' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to enable calendar sync:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Disable two-way sync by stopping Google Calendar push notifications
 */
export async function disableCalendarSync(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'calendar')
      .single();

    if (integrationError || !integration) {
      return { success: false, error: 'Calendar not connected' };
    }

    if (!integration.channel_id || !integration.resource_id) {
      // Nothing to disable
      return { success: true };
    }

    // Stop the push notification channel
    const stopResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/channels/stop',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: integration.channel_id,
          resourceId: integration.resource_id,
        }),
      }
    );

    // Clear the sync info from database (even if stop fails)
    const { error: updateError } = await supabase
      .from('user_integrations')
      .update({
        resource_id: null,
        channel_id: null,
        webhook_expiration: null,
      })
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'calendar');

    if (updateError) {
      logger.error('Failed to clear sync configuration:', updateError);
    }

    if (!stopResponse.ok) {
      const errorText = await stopResponse.text();
      logger.warn('Failed to stop Google Calendar channel:', errorText);
      // Don't return error - the channel will expire anyway
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to disable calendar sync:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if sync needs renewal (expires within 24 hours) and renew if needed
 */
export async function renewCalendarSyncIfNeeded(): Promise<void> {
  try {
    const status = await getCalendarSyncStatus();
    
    if (!status.enabled || !status.expiresAt) {
      return;
    }

    const expiresAt = new Date(status.expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Renew if expiring within 24 hours
    if (hoursUntilExpiry < 24) {
      logger.info('Calendar sync expiring soon, renewing...');
      await disableCalendarSync();
      await enableCalendarSync();
    }
  } catch (error) {
    logger.error('Failed to check/renew calendar sync:', error);
  }
}


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getUserIntegrations, disconnectIntegration, startGoogleConnect } from '@/services/integrations';
import { UserIntegration } from '@/services/integrations';
import { logger } from '@/lib/logger';
import { ReconnectGoogleBanner } from './ReconnectGoogleBanner';

export function ConnectedAccounts() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);

  const { toast } = useToast();

  // Load user integrations
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getUserIntegrations();
      setIntegrations(data);
    } catch (error) {
      logger.error('Failed to load user integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integration status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (kind: 'gmail' | 'calendar') => {
    try {
      setConnecting(kind);

      // Start OAuth flow with redirect
      await startGoogleConnect(kind, "redirect");

      // Note: The page will redirect, so we don't need to handle success here
      // The OAuthComplete page will handle the success/error and redirect back
    } catch (error) {
      logger.error('OAuth error:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to start Google OAuth. Please try again.',
        variant: 'destructive',
      });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (kind: 'gmail' | 'calendar') => {
    try {
      setDisconnecting(kind);

      await disconnectIntegration(kind);

      toast({
        title: 'Disconnected',
        description: `Successfully disconnected from ${kind === 'gmail' ? 'Gmail' : 'Google Calendar'}`,
      });

      // Reload integrations
      await loadIntegrations();
    } catch (error) {
      logger.error('Disconnect error:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const getIntegrationStatus = (kind: 'gmail' | 'calendar') => {
    const integration = integrations.find(i => i.kind === kind);
    return {
      connected: !!integration?.access_token,
      email: integration?.email,
      expiresAt: integration?.expires_at,
      lastSyncedAt: integration?.last_synced_at,
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your Google integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gmailStatus = getIntegrationStatus('gmail');
  const calendarStatus = getIntegrationStatus('calendar');

  return (
    <>
      <ReconnectGoogleBanner />
      <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Connect your Google account to enable Gmail and Calendar features. 
          Emails will be sent from your own Gmail address, and calendar events will sync to your calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gmail Integration */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#fef2f0] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-[#b8695f]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Gmail</h3>
              {gmailStatus.connected ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Connected</Badge>
                  <span className="text-sm text-muted-foreground">
                    as {gmailStatus.email}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {gmailStatus.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect('gmail')}
                disabled={disconnecting === 'gmail'}
              >
                {disconnecting === 'gmail' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleConnect('gmail')}
                disabled={connecting === 'gmail'}
              >
                {connecting === 'gmail' ? 'Connecting...' : 'Connect Gmail'}
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Integration */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Google Calendar</h3>
              {calendarStatus.connected ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Connected</Badge>
                  <span className="text-sm text-muted-foreground">
                    as {calendarStatus.email}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {calendarStatus.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect('calendar')}
                disabled={disconnecting === 'calendar'}
              >
                {disconnecting === 'calendar' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleConnect('calendar')}
                disabled={connecting === 'calendar'}
              >
                {connecting === 'calendar' ? 'Connecting...' : 'Connect Calendar'}
              </Button>
            )}
          </div>
        </div>

        {/* Integration Details */}
        {(gmailStatus.connected || calendarStatus.connected) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Integration Details</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {gmailStatus.connected && (
                <div>
                  <strong>Gmail:</strong> Last synced {gmailStatus.lastSyncedAt ? formatDate(gmailStatus.lastSyncedAt) : 'Never'}
                  {gmailStatus.expiresAt && (
                    <span className="ml-2">
                      • Expires {formatDate(gmailStatus.expiresAt)}
                    </span>
                  )}
                </div>
              )}
              {calendarStatus.connected && (
                <div>
                  <strong>Calendar:</strong> Last synced {calendarStatus.lastSyncedAt ? formatDate(calendarStatus.lastSyncedAt) : 'Never'}
                  {calendarStatus.expiresAt && (
                    <span className="ml-2">
                      • Expires {formatDate(calendarStatus.expiresAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}

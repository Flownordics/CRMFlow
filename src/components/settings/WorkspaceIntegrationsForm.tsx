import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getWorkspaceIntegrations, upsertWorkspaceIntegration, WorkspaceIntegration } from '@/services/integrations';
import { logger } from '@/lib/logger';

interface WorkspaceIntegrationsFormProps {
  workspaceId: string;
}

export function WorkspaceIntegrationsForm({ workspaceId }: WorkspaceIntegrationsFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<WorkspaceIntegration[]>([]);
  
  // Form state
  const [gmailCredentials, setGmailCredentials] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: '',
  });
  
  const [calendarCredentials, setCalendarCredentials] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: '',
  });

  const { toast } = useToast();

  // Load existing integrations
  useEffect(() => {
    loadIntegrations();
  }, [workspaceId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getWorkspaceIntegrations();
      setIntegrations(data);

      // Pre-fill form with existing data
      const gmail = data.find(i => i.kind === 'gmail');
      const calendar = data.find(i => i.kind === 'calendar');

      if (gmail) {
        setGmailCredentials({
          client_id: gmail.client_id,
          client_secret: gmail.client_secret,
          redirect_uri: gmail.redirect_uri,
        });
      }

      if (calendar) {
        setCalendarCredentials({
          client_id: calendar.client_id,
          client_secret: calendar.client_secret,
          redirect_uri: calendar.redirect_uri,
        });
      }
    } catch (error) {
      logger.error('Failed to load integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workspace integrations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveIntegration = async (kind: 'gmail' | 'calendar') => {
    try {
      setSaving(true);
      const credentials = kind === 'gmail' ? gmailCredentials : calendarCredentials;
      
      if (!credentials.client_id || !credentials.client_secret || !credentials.redirect_uri) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      await upsertWorkspaceIntegration(kind, credentials);
      
      toast({
        title: 'Success',
        description: `${kind === 'gmail' ? 'Gmail' : 'Calendar'} integration saved successfully`,
      });

      // Reload integrations to get updated data
      await loadIntegrations();
    } catch (error) {
      logger.error('Failed to save integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save integration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace Integrations</CardTitle>
          <CardDescription>Configure Google OAuth credentials for your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Integrations</CardTitle>
        <CardDescription>
          Configure Google OAuth credentials for your workspace. These are the "Bring Your Own Google" (BYOG) credentials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gmail" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gmail">Gmail</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="gmail" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="gmail-client-id">Client ID</Label>
                <Input
                  id="gmail-client-id"
                  type="text"
                  placeholder="Enter Google OAuth Client ID"
                  value={gmailCredentials.client_id}
                  onChange={(e) => setGmailCredentials(prev => ({ ...prev, client_id: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="gmail-client-secret">Client Secret</Label>
                <Input
                  id="gmail-client-secret"
                  type="password"
                  placeholder="Enter Google OAuth Client Secret"
                  value={gmailCredentials.client_secret}
                  onChange={(e) => setGmailCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="gmail-redirect-uri">Redirect URI</Label>
                <Input
                  id="gmail-redirect-uri"
                  type="text"
                  placeholder="https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-oauth-callback"
                  value={gmailCredentials.redirect_uri}
                  onChange={(e) => setGmailCredentials(prev => ({ ...prev, redirect_uri: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Must match exactly what you configured in Google Cloud Console
                </p>
              </div>

              <Button 
                onClick={() => saveIntegration('gmail')} 
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Gmail Integration'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="calendar-client-id">Client ID</Label>
                <Input
                  id="calendar-client-id"
                  type="text"
                  placeholder="Enter Google OAuth Client ID"
                  value={calendarCredentials.client_id}
                  onChange={(e) => setCalendarCredentials(prev => ({ ...prev, client_id: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="calendar-client-secret">Client Secret</Label>
                <Input
                  id="calendar-client-secret"
                  type="password"
                  placeholder="Enter Google OAuth Client Secret"
                  value={calendarCredentials.client_secret}
                  onChange={(e) => setCalendarCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="calendar-redirect-uri">Redirect URI</Label>
                <Input
                  id="calendar-redirect-uri"
                  type="text"
                  placeholder="https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-oauth-callback"
                  value={calendarCredentials.redirect_uri}
                  onChange={(e) => setCalendarCredentials(prev => ({ ...prev, redirect_uri: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Must match exactly what you configured in Google Cloud Console
                </p>
              </div>

              <Button 
                onClick={() => saveIntegration('calendar')} 
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Calendar Integration'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Create or select a project</li>
            <li>Enable Gmail API and/or Calendar API</li>
            <li>Create OAuth 2.0 credentials (Web application)</li>
            <li>Set redirect URI to: <code className="bg-blue-100 px-1 rounded">https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-oauth-callback</code></li>
            <li>Copy Client ID and Client Secret to the form above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

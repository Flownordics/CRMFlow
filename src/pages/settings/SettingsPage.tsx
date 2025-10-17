import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectedAccounts } from '@/components/settings/ConnectedAccounts';
import { CalendarSyncSettings } from '@/components/settings/CalendarSyncSettings';
import { UserInvitations } from '@/components/settings/UserInvitations';
import { TrashBinSettings } from '@/components/settings/TrashBinSettings';
import { Can } from '@/components/auth/Can';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export function SettingsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getWorkspaceId = useCallback(async () => {
    try {
      // Get workspace ID from workspace_settings (single-tenant)
      const { data: workspaceSettings, error } = await supabase
        .from('workspace_settings')
        .select('id')
        .limit(1)
        .single();

      if (error) {
        logger.error('Failed to get workspace ID:', error);
        return;
      }

      setWorkspaceId(workspaceSettings.id);
    } catch (error) {
      logger.error('Error getting workspace ID:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getWorkspaceId();
  }, [getWorkspaceId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your application settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[#b8695f]">Failed to load workspace configuration.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings and integrations.
          </p>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <Can role="admin">
              <TabsTrigger value="users">Users</TabsTrigger>
            </Can>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="trash">Trash Bin</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <ConnectedAccounts />
            <CalendarSyncSettings />
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>
                  Configure timezone and regional preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="timezone" className="text-sm font-medium">
                      Timezone
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Currently: Europe/Copenhagen (Danish Time)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Note: Your browser automatically uses your local timezone. 
                      All events are stored in UTC and displayed in your local time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <Can role="admin">
            <TabsContent value="users" className="space-y-6">
              <UserInvitations />
            </TabsContent>
          </Can>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and privacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Security settings will be available here in future updates.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trash" className="space-y-6">
            <TrashBinSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Add default export for lazy loading
export default SettingsPage;

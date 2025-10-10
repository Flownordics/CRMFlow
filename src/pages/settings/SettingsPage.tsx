import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceIntegrationsForm } from '@/components/settings/WorkspaceIntegrationsForm';
import { ConnectedAccounts } from '@/components/settings/ConnectedAccounts';
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
            <p className="text-red-600">Failed to load workspace configuration.</p>
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
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <WorkspaceIntegrationsForm workspaceId={workspaceId} />
            <ConnectedAccounts />
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general application settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  General settings will be available here in future updates.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

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
        </Tabs>
      </div>
    </div>
  );
}

// Add default export for lazy loading
export default SettingsPage;

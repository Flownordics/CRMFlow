import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCalendarSyncStatus, enableCalendarSync, disableCalendarSync, type CalendarSyncStatus } from '@/services/calendarSync';
import { formatDistanceToNow } from 'date-fns';

export function CalendarSyncSettings() {
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<CalendarSyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkSyncStatus = async () => {
    setChecking(true);
    try {
      const status = await getCalendarSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to check sync status:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const handleToggleSync = async () => {
    setLoading(true);
    try {
      if (syncStatus?.enabled) {
        // Disable sync
        const result = await disableCalendarSync();
        if (result.success) {
          toast({
            title: 'Two-Way Sync Disabled',
            description: 'Google Calendar changes will no longer sync to CRMFlow.',
          });
          await checkSyncStatus();
        } else {
          throw new Error(result.error || 'Failed to disable sync');
        }
      } else {
        // Enable sync
        const result = await enableCalendarSync();
        if (result.success) {
          toast({
            title: 'Two-Way Sync Enabled!',
            description: 'Changes in Google Calendar will now automatically sync to CRMFlow.',
            variant: 'success',
          });
          await checkSyncStatus();
        } else {
          throw new Error(result.error || 'Failed to enable sync');
        }
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: error instanceof Error ? error.message : 'Failed to toggle sync',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Two-Way Calendar Sync
            </CardTitle>
            <CardDescription>
              Automatically sync changes between Google Calendar and CRMFlow
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkSyncStatus}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sync-toggle">Enable Two-Way Sync</Label>
            <p className="text-sm text-muted-foreground">
              Sync events created or modified in Google Calendar back to CRMFlow
            </p>
          </div>
          <Switch
            id="sync-toggle"
            checked={syncStatus?.enabled || false}
            onCheckedChange={handleToggleSync}
            disabled={loading || checking}
          />
        </div>

        {syncStatus?.enabled && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Sync Active</span>
            </div>

            {syncStatus.lastSyncAt && (
              <div className="text-sm text-muted-foreground">
                Last synced: {formatDistanceToNow(new Date(syncStatus.lastSyncAt), { addSuffix: true })}
              </div>
            )}
          </div>
        )}

        {!syncStatus?.enabled && !checking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
            <XCircle className="h-4 w-4" />
            <span>Two-way sync is disabled. Events created in CRMFlow will still sync to Google Calendar.</span>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>CRMFlow → Google: Always enabled (one-way sync)</li>
            <li>Google → CRMFlow: Enable two-way sync to get Google changes</li>
            <li>Events are matched by Google Calendar ID</li>
            <li>Toggle off to disconnect anytime</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InfoIcon, XIcon } from 'lucide-react';
import { getUserIntegrations } from '@/services/integrations';

/**
 * Banner that prompts users to reconnect their Google accounts after migrating
 * from per-workspace credentials to centralized OAuth.
 * 
 * Shows only if:
 * 1. User has dismissed the banner before (stored in localStorage)
 * 2. User hasn't connected any Google integrations yet
 */
export function ReconnectGoogleBanner() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    try {
      // Check if user has dismissed the banner
      const dismissed = localStorage.getItem('google-oauth-migration-banner-dismissed');
      if (dismissed === 'true') {
        setLoading(false);
        return;
      }

      // Check if user has any connected integrations
      const integrations = await getUserIntegrations();
      const hasConnectedIntegrations = integrations.some(
        i => i.access_token && i.refresh_token
      );

      // Only show if user has no connected integrations
      setShow(!hasConnectedIntegrations);
    } catch (error) {
      console.error('Failed to check integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('google-oauth-migration-banner-dismissed', 'true');
    setShow(false);
  };

  if (loading || !show) {
    return null;
  }

  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-blue-900 font-semibold mb-1">
              Google Integration Updated
            </AlertTitle>
            <AlertDescription className="text-blue-800 text-sm">
              We've upgraded our Google integration! You now connect your own Google account directly. 
              Please reconnect your Gmail and Calendar below to continue using these features.
              Your emails will be sent from your own Gmail address.
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 -mt-1 -mr-2"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}


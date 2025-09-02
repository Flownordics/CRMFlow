import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, Calendar, CheckCircle, XCircle, ExternalLink, Settings } from "lucide-react";
import { useUserIntegrations, useDeleteUserIntegration } from "@/services/integrations";
import { startGoogleConnect } from "@/services/oauth";
import { GOOGLE_SCOPES } from "@/types/integrations";

export function IntegrationsForm() {
  const [isConnecting, setIsConnecting] = useState<'gmail' | 'calendar' | null>(null);
  const [showCredentialsForm, setShowCredentialsForm] = useState<'gmail' | 'calendar' | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');

  const { data: integrations, isLoading, error } = useUserIntegrations();
  const deleteIntegration = useDeleteUserIntegration();

  const gmailIntegration = integrations?.find(i => i.kind === 'gmail');
  const calendarIntegration = integrations?.find(i => i.kind === 'calendar');

  const handleConnect = async (kind: 'gmail' | 'calendar') => {
    setShowCredentialsForm(kind);
  };

  const handleSubmitCredentials = async (kind: 'gmail' | 'calendar') => {
    if (!googleClientId.trim() || !googleClientSecret.trim()) {
      alert('Please enter both Client ID and Client Secret');
      return;
    }

    setIsConnecting(kind);

    try {
      await startGoogleConnect(kind, googleClientId.trim(), googleClientSecret.trim());
      // The user will be redirected to Google OAuth, so we don't need to do anything else here
    } catch (error) {
      console.error(`Failed to start Google OAuth for ${kind}:`, error);
      alert(`Failed to start Google OAuth: ${error.message}`);
    } finally {
      setIsConnecting(null);
      setShowCredentialsForm(null);
      setGoogleClientId('');
      setGoogleClientSecret('');
    }
  };

  const handleCancelCredentials = () => {
    setShowCredentialsForm(null);
    setGoogleClientId('');
    setGoogleClientSecret('');
  };

  const handleDisconnect = async (kind: 'gmail' | 'calendar') => {
    try {
      await deleteIntegration.mutateAsync(kind);
    } catch (error) {
      console.error(`Failed to disconnect ${kind}:`, error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your accounts to enable additional features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your accounts to enable additional features</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load integrations. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect your accounts to enable additional features like sending emails and managing calendar events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gmail Integration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium">Gmail</h3>
                <p className="text-sm text-muted-foreground">
                  Send emails directly from your Gmail account
                </p>
              </div>
            </div>
            {gmailIntegration ? (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect('gmail')}
                  disabled={deleteIntegration.isPending}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => handleConnect('gmail')}
                disabled={isConnecting === 'gmail'}
              >
                {isConnecting === 'gmail' ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>

          {gmailIntegration && (
            <div className="ml-8 space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Connected as:</span>
                <span className="font-medium">{gmailIntegration.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Scopes:</span>
                <div className="flex flex-wrap gap-1">
                  {gmailIntegration.scopes.map((scope, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {scope.includes('gmail.send') ? 'Send emails' :
                        scope.includes('gmail.readonly') ? 'Read emails' :
                          scope.includes('gmail.modify') ? 'Modify emails' : scope}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                CRM will send quotes and other emails via your Gmail account.
              </p>
            </div>
          )}

          {/* Credentials Form for Gmail */}
          {showCredentialsForm === 'gmail' && (
            <div className="ml-8 p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="gmail-client-id">Google Client ID</Label>
                <Input
                  id="gmail-client-id"
                  type="text"
                  placeholder="Enter your Google OAuth Client ID"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gmail-client-secret">Google Client Secret</Label>
                <Input
                  id="gmail-client-secret"
                  type="password"
                  placeholder="Enter your Google OAuth Client Secret"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSubmitCredentials('gmail')}
                  disabled={isConnecting === 'gmail'}
                  size="sm"
                >
                  {isConnecting === 'gmail' ? 'Connecting...' : 'Connect'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelCredentials}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Calendar Integration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="font-medium">Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage calendar events
                </p>
              </div>
            </div>
            {calendarIntegration ? (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect('calendar')}
                  disabled={deleteIntegration.isPending}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => handleConnect('calendar')}
                disabled={isConnecting === 'calendar'}
              >
                {isConnecting === 'calendar' ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>

          {calendarIntegration && (
            <div className="ml-8 space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Connected as:</span>
                <span className="font-medium">{calendarIntegration.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Scopes:</span>
                <div className="flex flex-wrap gap-1">
                  {calendarIntegration.scopes.map((scope, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {scope.includes('calendar.events') ? 'Manage events' :
                        scope.includes('calendar.readonly') ? 'Read calendar' :
                          scope.includes('calendar') ? 'Full access' : scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Credentials Form for Calendar */}
          {showCredentialsForm === 'calendar' && (
            <div className="ml-8 p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="calendar-client-id">Google Client ID</Label>
                <Input
                  id="calendar-client-id"
                  type="text"
                  placeholder="Enter your Google OAuth Client ID"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-client-secret">Google Client Secret</Label>
                <Input
                  id="calendar-client-secret"
                  type="password"
                  placeholder="Enter your Google OAuth Client Secret"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSubmitCredentials('calendar')}
                  disabled={isConnecting === 'calendar'}
                  size="sm"
                >
                  {isConnecting === 'calendar' ? 'Connecting...' : 'Connect'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelCredentials}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Integrations are stored securely and only accessible to you. You can disconnect at any time.
            <br />
            <a
              href="https://support.google.com/accounts/answer/6010255"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
            >
              Learn more about Google account security
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

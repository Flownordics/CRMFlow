import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingNumberingForm } from "@/components/settings/BrandingNumberingForm";
import { StageProbabilitiesForm } from "@/components/settings/StageProbabilitiesForm";
import { ConnectedAccountsForm } from "@/components/settings/ConnectedAccountsForm";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { useWorkspaceSettings } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useWorkspaceSettings();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your workspace configuration and preferences"
        />
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your workspace configuration and preferences"
        />
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load settings. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace configuration and preferences"
      />

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding" data-testid="branding-tab">Branding & Numbering</TabsTrigger>
          <TabsTrigger value="probabilities">Stage Probabilities</TabsTrigger>
          <TabsTrigger value="integrations">Connected Accounts</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <BrandingNumberingForm settings={settings} />
        </TabsContent>

        <TabsContent value="probabilities" className="space-y-4">
          <StageProbabilitiesForm />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <ConnectedAccountsForm />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <PreferencesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

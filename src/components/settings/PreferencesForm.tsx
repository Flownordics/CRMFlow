import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useUserSettings, useUpdateUserSettings } from "@/services/settings";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { logger } from '@/lib/logger';

const PreferencesSchema = z.object({
    locale: z.enum(["en", "da"]),
    theme: z.enum(["light", "dark", "system"]),
    // Google integration removed - starting fresh
    calendar_default_sync: z.boolean(),
});

type PreferencesData = z.infer<typeof PreferencesSchema>;

export function PreferencesForm() {
    const { data: userSettings, isLoading, error } = useUserSettings();
    const updateUserSettings = useUpdateUserSettings();

    const form = useForm<PreferencesData>({
        resolver: zodResolver(PreferencesSchema),
        defaultValues: {
            locale: "en",
            theme: "system",
            // Google integration removed - starting fresh
            calendar_default_sync: false,
        },
    });

    // Update form values when userSettings are loaded
    React.useEffect(() => {
        if (userSettings) {
            form.reset({
                locale: userSettings.locale ?? "en",
                theme: userSettings.theme ?? "system",
                // Google integration removed - starting fresh
                calendar_default_sync: userSettings.calendar_default_sync ?? false,
            });
        }
    }, [userSettings, form]);

    const onSubmit = async (data: PreferencesData) => {
        logger.debug("Form data:", data);
        try {
            const result = await updateUserSettings.mutateAsync({
                locale: data.locale,
                theme: data.theme,
                calendar_show_google: data.calendar_show_google,
                calendar_default_sync: data.calendar_default_sync,
            });
            logger.debug("Update result:", result);
            toast.success("Preferences updated successfully");
        } catch (error) {
            logger.error("Failed to update preferences:", error);
            toast.error("Failed to update preferences");
        }
    };

    const isSaving = updateUserSettings.isPending;

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Preferences</h2>
                    <p className="text-xs text-muted-foreground">
                        Personal settings and preferences.
                    </p>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Preferences</h2>
                    <p className="text-xs text-muted-foreground">
                        Personal settings and preferences.
                    </p>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load preferences. Please check your connection and try again.
                    </AlertDescription>
                </Alert>
            </Card>
        );
    }

    return (
        <Card className="p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Preferences</h2>
                <p className="text-xs text-muted-foreground">
                    Personal settings and preferences.
                </p>
            </div>

            <form className="grid gap-4 max-w-xl" onSubmit={form.handleSubmit(onSubmit)}>
                {/* Language */}
                <div className="space-y-2">
                    <Label htmlFor="locale">Language</Label>
                    <Select
                        value={form.watch("locale")}
                        onValueChange={(value) => form.setValue("locale", value as "en" | "da")}
                    >
                        <SelectTrigger id="locale">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="da">Dansk</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                        value={form.watch("theme")}
                        onValueChange={(value) => form.setValue("theme", value as "light" | "dark" | "system")}
                    >
                        <SelectTrigger id="theme">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Calendar Settings */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="calendar_show_google"
                            checked={form.watch("calendar_show_google")}
                            onCheckedChange={(checked) => form.setValue("calendar_show_google", checked)}
                        />
                        <Label htmlFor="calendar_show_google">Show Google Calendar events</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="calendar_default_sync"
                            checked={form.watch("calendar_default_sync")}
                            onCheckedChange={(checked) => form.setValue("calendar_default_sync", checked)}
                        />
                        <Label htmlFor="calendar_default_sync">Sync calendar by default</Label>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-2 pt-2">
                    <Button
                        type="submit"
                        disabled={!form.formState.isDirty || isSaving}
                        aria-label="Save preferences"
                    >
                        {isSaving ? "Saving..." : "Save preferences"}
                    </Button>
                    {/* Debug info */}
                    <div className="text-xs text-muted-foreground">
                        Form dirty: {form.formState.isDirty ? "Yes" : "No"} |
                        Saving: {isSaving ? "Yes" : "No"}
                    </div>
                </div>
            </form>
        </Card>
    );
}

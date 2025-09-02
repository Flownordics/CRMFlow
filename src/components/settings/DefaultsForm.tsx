import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DefaultsFormSchema, type DefaultsFormData } from "@/lib/schemas/settings";
import { useUpdateWorkspaceSettings } from "@/hooks/useSettings";
import { type WorkspaceSettings } from "@/services/settings";
import { useState } from "react";

interface DefaultsFormProps {
    settings: WorkspaceSettings | null;
}

export function DefaultsForm({ settings }: DefaultsFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const updateSettings = useUpdateWorkspaceSettings();

    const form = useForm<DefaultsFormData>({
        resolver: zodResolver(DefaultsFormSchema),
        defaultValues: {
            default_currency: settings?.default_currency || "DKK",
            default_tax_pct: settings?.default_tax_pct || 25,
        },
    });

    const onSubmit = async (data: DefaultsFormData) => {
        try {
            await updateSettings.mutateAsync(data);
            setIsEditing(false);
            form.reset(data);
        } catch (error) {
            console.error("Failed to update default settings:", error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        form.reset({
            default_currency: settings?.default_currency || "DKK",
            default_tax_pct: settings?.default_tax_pct || 25,
        });
    };

    if (!isEditing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Default Values
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            Edit
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Set default values for new documents and deals
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-medium">Default Currency</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {settings?.default_currency || "DKK"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Default Tax Rate</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {settings?.default_tax_pct || 25}%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Default Values</CardTitle>
                <CardDescription>
                    Set default values for new documents and deals
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="default_currency">Default Currency *</Label>
                            <Select
                                value={form.watch("default_currency")}
                                onValueChange={(value) => form.setValue("default_currency", value as "DKK" | "EUR" | "USD")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.default_currency && (
                                <p className="text-sm text-destructive" role="alert">
                                    {form.formState.errors.default_currency.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="default_tax_pct">Default Tax Rate (%) *</Label>
                            <Input
                                id="default_tax_pct"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                {...form.register("default_tax_pct", { valueAsNumber: true })}
                                placeholder="25"
                            />
                            {form.formState.errors.default_tax_pct && (
                                <p className="text-sm text-destructive" role="alert">
                                    {form.formState.errors.default_tax_pct.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button type="submit" disabled={updateSettings.isPending}>
                            {updateSettings.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

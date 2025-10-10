import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NumberingFormSchema, type NumberingFormData } from "@/lib/schemas/settings";
import { useUpdateWorkspaceSettings } from "@/hooks/useSettings";
import { type WorkspaceSettings } from "@/services/settings";
import { useState } from "react";
import { logger } from '@/lib/logger';

interface NumberingFormProps {
    settings: WorkspaceSettings | null;
}

export function NumberingForm({ settings }: NumberingFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const updateSettings = useUpdateWorkspaceSettings();

    const form = useForm<NumberingFormData>({
        resolver: zodResolver(NumberingFormSchema),
        defaultValues: {
            quote_prefix: settings?.quote_prefix || "QUOTE",
            order_prefix: settings?.order_prefix || "ORDER",
            invoice_prefix: settings?.invoice_prefix || "INV",
            pad: settings?.pad || 4,
            year_infix: settings?.year_infix ?? true,
        },
    });

    const onSubmit = async (data: NumberingFormData) => {
        try {
            await updateSettings.mutateAsync(data);
            setIsEditing(false);
            form.reset(data);
        } catch (error) {
            logger.error("Failed to update numbering settings:", error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        form.reset({
            quote_prefix: settings?.quote_prefix || "QUOTE",
            order_prefix: settings?.order_prefix || "ORDER",
            invoice_prefix: settings?.invoice_prefix || "INV",
            pad: settings?.pad || 4,
            year_infix: settings?.year_infix ?? true,
        });
    };

    const formatExample = (prefix: string, pad: number, yearInfix: boolean) => {
        const year = new Date().getFullYear();
        const infix = yearInfix ? `-${year}-` : "-";
        const counter = "1".padStart(pad, "0");
        return `${prefix}${infix}${counter}`;
    };

    if (!isEditing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Document Numbering
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            Edit
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Configure how document numbers are generated
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-medium">Quote Prefix</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {settings?.quote_prefix || "QUOTE"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Order Prefix</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {settings?.order_prefix || "ORDER"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Invoice Prefix</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {settings?.invoice_prefix || "INV"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Padding</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {settings?.pad || 4} digits
                            </p>
                        </div>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Year Infix</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                            {settings?.year_infix ? "Enabled" : "Disabled"}
                        </p>
                    </div>
                    <div className="pt-2 border-t">
                        <Label className="text-sm font-medium">Example Format</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                            {formatExample(
                                settings?.quote_prefix || "QUOTE",
                                settings?.pad || 4,
                                settings?.year_infix ?? true
                            )}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Document Numbering</CardTitle>
                <CardDescription>
                    Configure how document numbers are generated
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quote_prefix">Quote Prefix *</Label>
                            <Input
                                id="quote_prefix"
                                {...form.register("quote_prefix")}
                                placeholder="QUOTE"
                            />
                            {form.formState.errors.quote_prefix && (
                                <p className="text-sm text-destructive" role="alert">
                                    {form.formState.errors.quote_prefix.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="order_prefix">Order Prefix *</Label>
                            <Input
                                id="order_prefix"
                                {...form.register("order_prefix")}
                                placeholder="ORDER"
                            />
                            {form.formState.errors.order_prefix && (
                                <p className="text-sm text-destructive" role="alert">
                                    {form.formState.errors.order_prefix.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invoice_prefix">Invoice Prefix *</Label>
                            <Input
                                id="invoice_prefix"
                                {...form.register("invoice_prefix")}
                                placeholder="INV"
                            />
                            {form.formState.errors.invoice_prefix && (
                                <p className="text-sm text-destructive" role="alert">
                                    {form.formState.errors.invoice_prefix.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pad">Padding *</Label>
                            <Input
                                id="pad"
                                type="number"
                                {...form.register("pad", { valueAsNumber: true })}
                                min={1}
                                max={10}
                                placeholder="4"
                            />
                            {form.formState.errors.pad && (
                                <p className="text-sm text-destructive" role="alert">
                                    {form.formState.errors.pad.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="year_infix"
                            checked={form.watch("year_infix")}
                            onCheckedChange={(checked) => form.setValue("year_infix", checked)}
                        />
                        <Label htmlFor="year_infix">Include year in document numbers</Label>
                    </div>

                    <div className="pt-2 border-t">
                        <Label className="text-sm font-medium">Preview</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                            {formatExample(
                                form.watch("quote_prefix"),
                                form.watch("pad"),
                                form.watch("year_infix")
                            )}
                        </p>
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

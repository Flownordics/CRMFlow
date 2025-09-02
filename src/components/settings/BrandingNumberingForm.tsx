import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useUpdateWorkspaceSettings } from "@/hooks/useSettings";
import { type WorkspaceSettings } from "@/services/settings";
import { toast } from "sonner";

const BrandingNumberingSchema = z.object({
    org_name: z.string().min(1, "Organization name is required"),
    default_currency: z.enum(["DKK", "EUR", "USD"]),
    default_tax_pct: z.number().min(0).max(100),
    number_prefix: z.string().min(1, "Number prefix is required"),
    number_pad: z.number().int().min(1).max(8),
    year_infix: z.boolean(),
    pdf_footer: z.string().optional(),
});

type BrandingNumberingData = z.infer<typeof BrandingNumberingSchema>;

interface BrandingNumberingFormProps {
    settings: WorkspaceSettings | null;
}

export function BrandingNumberingForm({ settings }: BrandingNumberingFormProps) {
    const updateSettings = useUpdateWorkspaceSettings();

    const form = useForm<BrandingNumberingData>({
        resolver: zodResolver(BrandingNumberingSchema),
        defaultValues: {
            org_name: settings?.org_name || "",
            default_currency: settings?.default_currency || "DKK",
            default_tax_pct: settings?.default_tax_pct || 25,
            number_prefix: settings?.quote_prefix || "QUOTE", // Using quote_prefix as number_prefix
            number_pad: settings?.pad || 4,
            year_infix: settings?.year_infix ?? true,
            pdf_footer: settings?.pdf_footer || "",
            email_template_quote_html: settings?.email_template_quote_html || "",
            email_template_quote_text: settings?.email_template_quote_text || "",
        },
    });

    const onSubmit = async (data: BrandingNumberingData) => {
        try {
            await updateSettings.mutateAsync({
                org_name: data.org_name,
                default_currency: data.default_currency,
                default_tax_pct: data.default_tax_pct,
                quote_prefix: data.number_prefix,
                order_prefix: data.number_prefix,
                invoice_prefix: data.number_prefix,
                pad: data.number_pad,
                year_infix: data.year_infix,
                pdf_footer: data.pdf_footer || null,
                email_template_quote_html: data.email_template_quote_html || null,
                email_template_quote_text: data.email_template_quote_text || null,
            });
            toast.success("Settings updated successfully");
        } catch (error) {
            console.error("Failed to update settings:", error);
            toast.error("Failed to update settings");
        }
    };

    const isSaving = updateSettings.isPending;

    return (
        <Card className="p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Branding & Numbering</h2>
                <p className="text-xs text-muted-foreground">
                    Organization and document numbering defaults.
                </p>
            </div>

            <form className="grid gap-3 max-w-xl" onSubmit={form.handleSubmit(onSubmit)}>
                {/* Organization Name */}
                <div className="space-y-2">
                    <Label htmlFor="org_name">Organization Name</Label>
                    <Input
                        id="org_name"
                        {...form.register("org_name")}
                        aria-invalid={!!form.formState.errors.org_name}
                    />
                    {form.formState.errors.org_name && (
                        <p className="text-xs text-destructive" role="alert">
                            {form.formState.errors.org_name.message}
                        </p>
                    )}
                </div>

                {/* Default Currency */}
                <div className="space-y-2">
                    <Label htmlFor="default_currency">Default Currency</Label>
                    <Select
                        value={form.watch("default_currency")}
                        onValueChange={(value) => form.setValue("default_currency", value as "DKK" | "EUR" | "USD")}
                    >
                        <SelectTrigger id="default_currency">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DKK">DKK (Danish Krone)</SelectItem>
                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                            <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Default Tax Percentage */}
                <div className="space-y-2">
                    <Label htmlFor="default_tax_pct">Default Tax %</Label>
                    <Input
                        id="default_tax_pct"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...form.register("default_tax_pct", { valueAsNumber: true })}
                        aria-invalid={!!form.formState.errors.default_tax_pct}
                    />
                    {form.formState.errors.default_tax_pct && (
                        <p className="text-xs text-destructive" role="alert">
                            {form.formState.errors.default_tax_pct.message}
                        </p>
                    )}
                </div>

                {/* Number Prefix */}
                <div className="space-y-2">
                    <Label htmlFor="number_prefix">Number Prefix</Label>
                    <Input
                        id="number_prefix"
                        {...form.register("number_prefix")}
                        aria-invalid={!!form.formState.errors.number_prefix}
                    />
                    {form.formState.errors.number_prefix && (
                        <p className="text-xs text-destructive" role="alert">
                            {form.formState.errors.number_prefix.message}
                        </p>
                    )}
                </div>

                {/* Number Pad */}
                <div className="space-y-2">
                    <Label htmlFor="number_pad">Number Pad</Label>
                    <Input
                        id="number_pad"
                        type="number"
                        min="1"
                        max="8"
                        {...form.register("number_pad", { valueAsNumber: true })}
                        aria-invalid={!!form.formState.errors.number_pad}
                    />
                    {form.formState.errors.number_pad && (
                        <p className="text-xs text-destructive" role="alert">
                            {form.formState.errors.number_pad.message}
                        </p>
                    )}
                </div>

                {/* Year Infix Toggle */}
                <div className="flex items-center space-x-2">
                    <Switch
                        id="year_infix"
                        checked={form.watch("year_infix")}
                        onCheckedChange={(checked) => form.setValue("year_infix", checked)}
                    />
                    <Label htmlFor="year_infix">Include year in document numbers</Label>
                </div>

                {/* PDF Footer */}
                <div className="space-y-2">
                    <Label htmlFor="pdf_footer">PDF Footer</Label>
                    <Textarea
                        id="pdf_footer"
                        placeholder="Thank you for your business."
                        {...form.register("pdf_footer")}
                        rows={3}
                    />
                </div>

                {/* Email Templates */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email_template_quote_html">Quote Email Template (HTML)</Label>
                        <Textarea
                            id="email_template_quote_html"
                            rows={4}
                            placeholder="<h1>Thank you for your quote request</h1>"
                            {...form.register("email_template_quote_html")}
                        />
                        <p className="text-xs text-muted-foreground">
                            HTML template for quote emails
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email_template_quote_text">Quote Email Template (Text)</Label>
                        <Textarea
                            id="email_template_quote_text"
                            rows={3}
                            placeholder="Thank you for your quote request"
                            {...form.register("email_template_quote_text")}
                        />
                        <p className="text-xs text-muted-foreground">
                            Plain text template for quote emails
                        </p>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-2 pt-2">
                    <Button
                        type="submit"
                        disabled={!form.formState.isDirty || isSaving}
                        aria-label="Save changes"
                    >
                        {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

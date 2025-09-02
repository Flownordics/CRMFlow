import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingFormSchema, type BrandingFormData } from "@/lib/schemas/settings";
import { useUpdateWorkspaceSettings } from "@/hooks/useSettings";
import { type WorkspaceSettings } from "@/services/settings";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface BrandingFormProps {
    settings: WorkspaceSettings | null;
}

export function BrandingForm({ settings }: BrandingFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("branding");
    const [isSendingTest, setIsSendingTest] = useState(false);
    const updateSettings = useUpdateWorkspaceSettings();

    const form = useForm<BrandingFormData>({
        resolver: zodResolver(BrandingFormSchema),
        defaultValues: {
            org_name: settings?.org_name || "",
            logo_url: settings?.logo_url || "",
            pdf_footer: settings?.pdf_footer || "",
            email_template_quote_html: settings?.email_template_quote_html || "",
            email_template_quote_text: settings?.email_template_quote_text || "",
        },
    });

    const onSubmit = async (data: BrandingFormData) => {
        try {
            await updateSettings.mutateAsync({
                ...data,
                logo_url: data.logo_url || null,
                pdf_footer: data.pdf_footer || null,
                email_template_quote_html: data.email_template_quote_html || null,
                email_template_quote_text: data.email_template_quote_text || null,
            });
            setIsEditing(false);
            form.reset(data);
        } catch (error) {
            console.error("Failed to update branding settings:", error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        form.reset({
            org_name: settings?.org_name || "",
            logo_url: settings?.logo_url || "",
            pdf_footer: settings?.pdf_footer || "",
            email_template_quote_html: settings?.email_template_quote_html || "",
            email_template_quote_text: settings?.email_template_quote_text || "",
        });
    };

    const sendTestEmail = async () => {
        if (!settings?.id) return;

        setIsSendingTest(true);
        try {
            // Create a test quote for preview
            const testQuote = {
                id: "test-quote-id",
                number: "QUOTE-2024-0001",
                totalMinor: 150000,
                currency: "DKK",
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            const testCompany = {
                name: "Test Company Ltd.",
                email: "test@example.com"
            };

            const testContact = {
                name: "John Doe",
                email: "john@testcompany.com"
            };

            const testWorkspace = {
                org_name: settings.org_name || "Your Company",
                pdf_footer: settings.pdf_footer || "Thank you for your business."
            };

            const testUser = {
                email: "user@example.com",
                name: "Current User"
            };

            const appUrl = window.location.origin;

            // Send test email using the send-quote function
            const response = await api.post("/functions/v1/send-quote", {
                quoteId: testQuote.id,
                to: testUser.email,
                subject: `Test Email - Quote ${testQuote.number}`,
                body: "This is a test email to verify your email template configuration.",
                userId: "test-user-id",
                isTest: true
            }, {
                headers: {
                    "idempotency-key": `test-${Date.now()}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.status === 200) {
                toast.success("Test email sent successfully!");
            } else {
                toast.error("Failed to send test email");
            }
        } catch (error) {
            console.error("Error sending test email:", error);
            toast.error("Failed to send test email");
        } finally {
            setIsSendingTest(false);
        }
    };

    const previewTemplate = (template: string, type: 'html' | 'text') => {
        if (!template) return "No template configured";

        // Simple template preview with sample data
        const sampleData = {
            workspace: {
                org_name: settings?.org_name || "Your Company",
                pdf_footer: settings?.pdf_footer || "Thank you for your business."
            },
            user: {
                email: "user@example.com",
                name: "Current User"
            },
            quote: {
                number: "QUOTE-2024-0001",
                total_minor: 150000,
                currency: "DKK",
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                id: "sample-quote-id"
            },
            company: {
                name: "Sample Company Ltd.",
                email: "info@samplecompany.com"
            },
            contact: {
                name: "John Doe",
                email: "john@samplecompany.com"
            },
            appUrl: window.location.origin
        };

        // Simple template variable replacement (basic handlebars-like)
        let preview = template;
        Object.entries(sampleData).forEach(([key, value]) => {
            if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    preview = preview.replace(new RegExp(`{{${key}.${subKey}}}`, 'g'), String(subValue));
                });
            } else {
                preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            }
        });

        // Handle conditional blocks
        preview = preview.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}/g, (match, condition, content) => {
            const conditionValue = condition.includes('.')
                ? condition.split('.').reduce((obj, key) => obj?.[key], sampleData)
                : sampleData[condition];
            return conditionValue ? content : '';
        });

        return preview;
    };

    if (!isEditing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Branding & Email Templates
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            Edit
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Customize your organization's branding and email templates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="branding">Branding</TabsTrigger>
                            <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
                        </TabsList>

                        <TabsContent value="branding" className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Organization Name</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {settings?.org_name || "Not set"}
                                </p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Logo URL</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {settings?.logo_url ? (
                                        <a href={settings.logo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {settings.logo_url}
                                        </a>
                                    ) : (
                                        "Not set"
                                    )}
                                </p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">PDF Footer</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {settings?.pdf_footer || "Not set"}
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="email-templates" className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Quote Email Template (HTML)</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {settings?.email_template_quote_html ? "Configured" : "Using default template"}
                                </p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Quote Email Template (Text)</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {settings?.email_template_quote_text ? "Configured" : "Using default template"}
                                </p>
                            </div>
                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    onClick={sendTestEmail}
                                    disabled={isSendingTest}
                                >
                                    {isSendingTest ? "Sending..." : "Send Test Email to Me"}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Branding & Email Templates</CardTitle>
                <CardDescription>
                    Customize your organization's branding and email templates
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="branding">Branding</TabsTrigger>
                            <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
                        </TabsList>

                        <TabsContent value="branding" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="org_name">Organization Name *</Label>
                                <Input
                                    id="org_name"
                                    {...form.register("org_name")}
                                    placeholder="Enter organization name"
                                />
                                {form.formState.errors.org_name && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {form.formState.errors.org_name.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="logo_url">Logo URL</Label>
                                <Input
                                    id="logo_url"
                                    {...form.register("logo_url")}
                                    placeholder="https://example.com/logo.png"
                                />
                                {form.formState.errors.logo_url && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {form.formState.errors.logo_url.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pdf_footer">PDF Footer</Label>
                                <Textarea
                                    id="pdf_footer"
                                    {...form.register("pdf_footer")}
                                    placeholder="Thank you for your business."
                                    rows={3}
                                />
                                {form.formState.errors.pdf_footer && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {form.formState.errors.pdf_footer.message}
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="email-templates" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email_template_quote_html">Quote Email Template (HTML)</Label>
                                <Textarea
                                    id="email_template_quote_html"
                                    {...form.register("email_template_quote_html")}
                                    placeholder="Enter HTML email template with handlebars variables"
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                                {form.formState.errors.email_template_quote_html && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {form.formState.errors.email_template_quote_html.message}
                                    </p>
                                )}
                                <div className="text-sm text-muted-foreground">
                                    Available variables: &#123;&#123; workspace.org_name &#125;&#125;, &#123;&#123; quote.number &#125;&#125;, &#123;&#123; quote.totalMinor &#125;&#125;, &#123;&#123; quote.currency &#125;&#125;, &#123;&#123; quote.validUntil &#125;&#125;, &#123;&#123; contact.name &#125;&#125;, &#123;&#123; company.name &#125;&#125;, &#123;&#123; appUrl &#125;&#125;
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email_template_quote_text">Quote Email Template (Text)</Label>
                                <Textarea
                                    id="email_template_quote_text"
                                    {...form.register("email_template_quote_text")}
                                    placeholder="Enter text email template with handlebars variables"
                                    rows={6}
                                    className="font-mono text-sm"
                                />
                                {form.formState.errors.email_template_quote_text && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {form.formState.errors.email_template_quote_text.message}
                                    </p>
                                )}
                                <div className="text-sm text-muted-foreground">
                                    Available variables: &#123;&#123; workspace.org_name &#125;&#125;, &#123;&#123; quote.number &#125;&#125;, &#123;&#123; quote.totalMinor &#125;&#125;, &#123;&#123; quote.currency &#125;&#125;, &#123;&#123; quote.validUntil &#125;&#125;, &#123;&#123; contact.name &#125;&#125;, &#123;&#123; company.name &#125;&#125;, &#123;&#123; appUrl &#125;&#125;
                                </div>
                            </div>

                            <div className="pt-2 space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={sendTestEmail}
                                    disabled={isSendingTest}
                                >
                                    {isSendingTest ? "Sending..." : "Send Test Email to Me"}
                                </Button>

                                <div className="text-sm text-muted-foreground">
                                    <p><strong>Preview with sample data:</strong></p>
                                    <div className="mt-2 p-3 bg-muted rounded-md">
                                        <p><strong>HTML Template:</strong></p>
                                        <div className="mt-1 text-xs" dangerouslySetInnerHTML={{
                                            __html: previewTemplate(settings?.email_template_quote_html || '', 'html')
                                        }} />

                                        <p className="mt-3"><strong>Text Template:</strong></p>
                                        <pre className="mt-1 text-xs whitespace-pre-wrap">{previewTemplate(settings?.email_template_quote_text || '', 'text')}</pre>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex gap-2 pt-6">
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

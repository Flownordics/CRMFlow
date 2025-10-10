import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { formatMoneyMinor } from "@/lib/money";
import { useCreateQuote } from "@/services/quotes";
import { logActivity } from "@/services/activity";
import { toastBus } from "@/lib/toastBus";
import { CompanySelect } from "@/components/selects/CompanySelect";
import { PersonSelect } from "@/components/selects/PersonSelect";
import { CompanyModal } from "@/components/companies/CompanyModal";
import { PersonModal } from "@/components/people/PersonModal";
import { useCreateCompany } from "@/services/companies";
import { useCreatePerson } from "@/services/people";
import { CalendarIcon, Plus, Trash2, FileText, Percent } from "lucide-react";
import { logger } from '@/lib/logger';

interface CreateQuoteModalProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    defaultDealId?: string;
    defaultCompanyId?: string;
    defaultContactId?: string;
    defaultCurrency?: string;
    expectedValueMinor?: number; // NEW (bruges som startværdifelt eller som sum-indikation)
    // Additional prefill fields from deal
    defaultTitle?: string;
    defaultNotes?: string;
    defaultTaxPct?: number;
    defaultValidUntil?: string;
    // Support for editing existing quotes
    defaultQuote?: {
        id: string;
        company_id: string;
        contact_id?: string;
        currency: string;
        issue_date: string;
        valid_until: string;
        notes?: string;
        lines: Array<{
            description: string;
            qty: number;
            unit_minor: number;
            tax_rate_pct: number;
            discount_pct: number;
        }>;
    };
    // Automation callback
    onSuccess?: (quote: { id: string }) => void;
}

// Zod schemas
const LineSchema = z.object({
    description: z.string().min(1, "required"),
    qty: z.number().positive("invalid_number"),
    unitMinor: z.number().nonnegative("invalid_number"),
    taxRatePct: z.number().min(0).max(100).optional(),
    discountPct: z.number().min(0).max(100).optional(),
});

const FormSchema = z.object({
    companyId: z.string().min(1, "required"),
    contactId: z.string().optional(),
    dealId: z.string().optional(),
    currency: z.enum(["DKK", "EUR", "USD"]).default("DKK"),
    taxPct: z.number().min(0).max(100).default(25),
    discountPct: z.number().min(0).max(100).default(0).optional(),
    issueDate: z.string().min(1),
    validUntil: z.string().min(1),
    notes: z.string().optional(),
    lines: z.array(LineSchema).min(1),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateQuoteModal({
    open,
    onOpenChange,
    defaultDealId,
    defaultCompanyId,
    defaultContactId,
    defaultCurrency,
    expectedValueMinor,
    defaultTitle,
    defaultNotes,
    defaultTaxPct,
    defaultValidUntil,
    defaultQuote,
    onSuccess,
}: CreateQuoteModalProps) {
    const { t } = useI18n();
    const navigate = useNavigate();

    // Modal states for inline creation
    const [companyModalOpen, setCompanyModalOpen] = useState(false);
    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [pendingCompanyName, setPendingCompanyName] = useState("");
    const [pendingPersonName, setPendingPersonName] = useState("");

    const createQuote = useCreateQuote();
    const createCompany = useCreateCompany();
    const createPerson = useCreatePerson();

    // Form setup
    const form = useForm<FormData>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            companyId: defaultCompanyId || "",
            contactId: defaultContactId || "",
            dealId: defaultDealId || "",
            currency: (defaultCurrency as "DKK" | "EUR" | "USD") || "DKK",
            taxPct: 25,
            discountPct: 0,
            issueDate: format(new Date(), "yyyy-MM-dd"),
            validUntil: format(addDays(new Date(), 14), "yyyy-MM-dd"),
            notes: "",
            lines: [{ description: "Item", qty: 1, unitMinor: 0, taxRatePct: 25 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });

    // Watch form values for live calculations using useWatch
    const lines = useWatch({
        control: form.control,
        name: "lines"
    });
    const taxPct = useWatch({
        control: form.control,
        name: "taxPct"
    });
    const discountPct = useWatch({
        control: form.control,
        name: "discountPct"
    });

    // Calculate totals
    const totals = useMemo(() => {
        let subtotalMinor = 0;
        let taxMinor = 0;

        if (lines) {
            lines.forEach((line) => {
                const lineSubtotal = line.qty * line.unitMinor * (1 - (line.discountPct || discountPct || 0) / 100);
                subtotalMinor += lineSubtotal;

                const effectiveTaxRate = line.taxRatePct ?? taxPct;
                taxMinor += lineSubtotal * (effectiveTaxRate / 100);
            });
        }

        return {
            subtotalMinor,
            taxMinor,
            totalMinor: subtotalMinor + taxMinor,
        };
    }, [lines, taxPct, discountPct]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (open) {
            if (defaultQuote) {
                // Prefill with existing quote data
                logger.debug("[CreateQuoteModal] Prefilling with existing quote:", defaultQuote);
                form.reset({
                    companyId: defaultQuote.company_id,
                    contactId: defaultQuote.contact_id || "",
                    dealId: "", // No deal ID for existing quotes
                    currency: defaultQuote.currency as "DKK" | "EUR" | "USD",
                    taxPct: 25, // Default tax
                    discountPct: 0,
                    issueDate: defaultQuote.issue_date.split('T')[0], // Convert ISO to YYYY-MM-DD
                    validUntil: defaultQuote.valid_until.split('T')[0], // Convert ISO to YYYY-MM-DD
                    notes: defaultQuote.notes || "",
                    lines: defaultQuote.lines.map((line: any) => ({
                        description: line.description,
                        qty: line.qty,
                        unitMinor: line.unit_minor,
                        taxRatePct: line.tax_rate_pct,
                        discountPct: line.discount_pct,
                    })),
                });
            } else {
                // Prefill logic: if from deal only (not fromQuoteId), create one standard line
                const initialLines = defaultDealId && !defaultDealId.includes('quote')
                    ? [{
                        description: defaultTitle || "Deal",
                        qty: 1,
                        unitMinor: expectedValueMinor || 0,
                        taxRatePct: defaultTaxPct || 25
                    }]
                    : [{ description: "Item", qty: 1, unitMinor: 0, taxRatePct: 25 }];

                form.reset({
                    companyId: defaultCompanyId || "",
                    contactId: defaultContactId || "",
                    dealId: defaultDealId || "",
                    currency: (defaultCurrency as "DKK" | "EUR" | "USD") || "DKK",
                    taxPct: defaultTaxPct || 25,
                    discountPct: 0,
                    issueDate: format(new Date(), "yyyy-MM-dd"),
                    validUntil: defaultValidUntil || format(addDays(new Date(), 14), "yyyy-MM-dd"),
                    notes: defaultNotes || "",
                    lines: initialLines,
                });
            }
        }
    }, [open, defaultCompanyId, defaultContactId, defaultDealId, defaultCurrency, expectedValueMinor, defaultTitle, defaultTaxPct, defaultValidUntil, defaultNotes, defaultQuote, form]);

    const handleCreateCompany = (companyName: string) => {
        setPendingCompanyName(companyName);
        setCompanyModalOpen(true);
    };

    const handleCreatePerson = (personName: string) => {
        setPendingPersonName(personName);
        setPersonModalOpen(true);
    };

    const onSubmit = async (data: FormData) => {
        try {
            const quote = await createQuote.mutateAsync({
                number: "", // Auto-generated
                status: "draft",
                currency: data.currency,
                issue_date: new Date(data.issueDate).toISOString(),
                valid_until: new Date(data.validUntil).toISOString(),
                notes: data.notes || "",
                company_id: data.companyId,
                contact_id: data.contactId || null,
                deal_id: data.dealId || null,
                subtotal_minor: totals.subtotalMinor,
                tax_minor: totals.taxMinor,
                total_minor: totals.totalMinor,
                lines: data.lines.map(line => ({
                    description: line.description,
                    qty: line.qty,
                    unit_minor: line.unitMinor,
                    tax_rate_pct: line.taxRatePct ?? 25,
                    discount_pct: line.discountPct ?? 0,
                })),
            });

            // Log activity
            try {
                if (data.dealId) {
                    await logActivity({
                        type: "quote_created",
                        dealId: data.dealId,
                        meta: {
                            quoteId: quote.id,
                            companyId: data.companyId,
                        },
                    });
                }
            } catch (error) {
                logger.error("Failed to log activity:", error);
            }

            // Call onSuccess callback if provided (for automation)
            if (onSuccess) {
                onSuccess(quote);
            } else {
                // Default behavior: show toast and navigate
                toastBus.emit({ title: "Quote created successfully" });
                onOpenChange(false);
                navigate(`/quotes/${quote.id}`);
            }
        } catch (error) {
            logger.error("Failed to create quote:", error);
            toastBus.emit({
                title: "Failed to create quote",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const addLine = () => {
        append({ description: "Item", qty: 1, unitMinor: 0, taxRatePct: 25 });
    };

    const removeLine = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <AccessibleDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Quote</DialogTitle>
                        <DialogDescription>Fill in the fields below. Pre-filled from deal.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Quote Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Company</label>
                                        <CompanySelect
                                            value={form.watch("companyId")}
                                            onChange={(value) => form.setValue("companyId", value)}
                                            onCreateRequested={handleCreateCompany}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Contact</label>
                                        <PersonSelect
                                            value={form.watch("contactId")}
                                            onChange={(value) => form.setValue("contactId", value)}
                                            companyId={form.watch("companyId") === "all" ? undefined : form.watch("companyId")}
                                            onCreateRequested={handleCreatePerson}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Currency</label>
                                        <Select
                                            value={form.watch("currency")}
                                            onValueChange={(value) => form.setValue("currency", value as "DKK" | "EUR" | "USD")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DKK">DKK</SelectItem>
                                                <SelectItem value="EUR">EUR</SelectItem>
                                                <SelectItem value="USD">USD</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">VAT %</label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                {...form.register("taxPct", { valueAsNumber: true })}
                                                className="pr-8"
                                            />
                                            <Percent className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Discount %</label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                {...form.register("discountPct", { valueAsNumber: true })}
                                                className="pr-8"
                                            />
                                            <Percent className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Issue Date</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {form.watch("issueDate") ? format(new Date(form.watch("issueDate")), "PPP") : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.watch("issueDate") ? new Date(form.watch("issueDate")) : undefined}
                                                    onSelect={(date) => form.setValue("issueDate", date ? format(date, "yyyy-MM-dd") : "")}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Valid Until</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {form.watch("validUntil") ? format(new Date(form.watch("validUntil")), "PPP") : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.watch("validUntil") ? new Date(form.watch("validUntil")) : undefined}
                                                    onSelect={(date) => form.setValue("validUntil", date ? format(date, "yyyy-MM-dd") : "")}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Notes</label>
                                    <Textarea
                                        {...form.register("notes")}
                                        placeholder="Notes..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Line Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Line Items</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-[auto_80px_120px_80px_80px] md:grid-cols-[auto_100px_140px_100px_100px] gap-2 items-center">
                                            <Input
                                                {...form.register(`lines.${index}.description`)}
                                                placeholder="Description"
                                                className="col-span-1"
                                            />
                                            <Input
                                                type="number"
                                                {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                                                placeholder="Qty"
                                                className="col-span-1"
                                            />
                                            <Input
                                                type="number"
                                                {...form.register(`lines.${index}.unitMinor`, { valueAsNumber: true })}
                                                placeholder="Unit"
                                                className="col-span-1"
                                            />
                                            <Input
                                                type="number"
                                                {...form.register(`lines.${index}.taxRatePct`, { valueAsNumber: true })}
                                                placeholder="VAT %"
                                                className="col-span-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeLine(index)}
                                                disabled={fields.length === 1}
                                                aria-label={`Remove line ${index + 1}`}
                                            >
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addLine}
                                    className="w-full"
                                >
                                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Add Line
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Totals */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="font-medium">{formatMoneyMinor(totals.subtotalMinor, form.watch("currency"))}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">VAT:</span>
                                        <span className="font-medium">{formatMoneyMinor(totals.taxMinor, form.watch("currency"))}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Total:</span>
                                        <span>{formatMoneyMinor(totals.totalMinor, form.watch("currency"))}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createQuote.isPending || !form.formState.isValid}
                                aria-busy={createQuote.isPending}
                            >
                                {createQuote.isPending ? "Creating..." : "Create Quote"}
                            </Button>
                        </div>
                    </form>
                </AccessibleDialogContent>
            </Dialog>

            {/* Inline modals for creating companies and people */}
            <CompanyModal
                open={companyModalOpen}
                onOpenChange={setCompanyModalOpen}
                defaultValues={{ name: pendingCompanyName }}
                onSuccess={(company) => {
                    form.setValue("companyId", company.id);
                    setCompanyModalOpen(false);
                    setPendingCompanyName("");
                }}
            />

            <PersonModal
                open={personModalOpen}
                onOpenChange={setPersonModalOpen}
                defaultValues={{
                    first_name: pendingPersonName.split(" ")[0] || "",
                    last_name: pendingPersonName.split(" ").slice(1).join(" ") || "Contact",
                    company_id: form.watch("companyId") === "all" ? undefined : form.watch("companyId")
                }}
                onSuccess={(person) => {
                    form.setValue("contactId", person.id);
                    setPersonModalOpen(false);
                    setPendingPersonName("");
                }}
            />
        </>
    );
}

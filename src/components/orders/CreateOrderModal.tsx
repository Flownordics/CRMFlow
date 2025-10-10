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
import { useCreateOrder } from "@/services/orders";
import { useQuote } from "@/services/quotes";
import { logActivity } from "@/services/activity";
import { toastBus } from "@/lib/toastBus";
import { CompanySelect } from "@/components/selects/CompanySelect";
import { PersonSelect } from "@/components/selects/PersonSelect";
import { CompanyModal } from "@/components/companies/CompanyModal";
import { PersonModal } from "@/components/people/PersonModal";
import { useCreateCompany } from "@/services/companies";
import { useCreatePerson } from "@/services/people";
import { CalendarIcon, Plus, Trash2, Package, Percent, Copy } from "lucide-react";
import { logger } from '@/lib/logger';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDealId?: string;
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultCurrency?: string;
  fromQuoteId?: string;
  expectedValueMinor?: number;
  // Additional prefill fields from deal
  defaultTitle?: string;
  defaultNotes?: string;
  defaultTaxPct?: number;
  defaultDeliveryDate?: string;
  // Automation callback
  onSuccess?: (order: { id: string }) => void;
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
  fromQuoteId: z.string().optional(),
  currency: z.enum(["DKK", "EUR", "USD"]).default("DKK"),
  taxPct: z.number().min(0).max(100).default(25),
  discountPct: z.number().min(0).max(100).default(0).optional(),
  orderDate: z.string().min(1),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(LineSchema).min(1),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateOrderModal({
  open,
  onOpenChange,
  defaultDealId,
  defaultCompanyId,
  defaultContactId,
  defaultCurrency,
  fromQuoteId,
  expectedValueMinor,
  defaultTitle,
  defaultNotes,
  defaultTaxPct,
  defaultDeliveryDate,
  onSuccess,
}: CreateOrderModalProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  // Modal states for inline creation
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [pendingCompanyName, setPendingCompanyName] = useState("");
  const [pendingPersonName, setPendingPersonName] = useState("");

  const createOrder = useCreateOrder();
  const createCompany = useCreateCompany();
  const createPerson = useCreatePerson();

  // Fetch quote data if fromQuoteId is provided
  const { data: quoteData } = useQuote(fromQuoteId || "");

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      companyId: defaultCompanyId || "",
      contactId: defaultContactId || "",
      dealId: defaultDealId || "",
      fromQuoteId: fromQuoteId || "",
      currency: (defaultCurrency as "DKK" | "EUR" | "USD") || "DKK",
      taxPct: 25,
      discountPct: 0,
      orderDate: format(new Date(), "yyyy-MM-dd"),
      deliveryDate: "",
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

  // Prefill from quote data
  useEffect(() => {
    if (quoteData && fromQuoteId) {
      const quote = quoteData;
      const quoteLines = quote.lines || [];

      form.reset({
        companyId: quote.company_id || defaultCompanyId || "",
        contactId: quote.contact_id || defaultContactId || "",
        dealId: quote.deal_id || defaultDealId || "",
        fromQuoteId: fromQuoteId,
        currency: (defaultCurrency as "DKK" | "EUR" | "USD") || quote.currency || "DKK",
        taxPct: 25,
        discountPct: 0,
        orderDate: format(new Date(), "yyyy-MM-dd"),
        deliveryDate: "",
        notes: `Converted from quote ${quote.number || quote.id}`,
        lines: quoteLines.length > 0
          ? quoteLines.map(line => ({
            description: line.description || "",
            qty: line.qty || 1,
            unitMinor: line.unitMinor || 0,
            taxRatePct: line.taxRatePct || 25,
            discountPct: line.discountPct || 0,
          }))
          : [{ description: "Item", qty: 1, unitMinor: 0, taxRatePct: 25 }],
      });
    }
  }, [quoteData, fromQuoteId, defaultCompanyId, defaultContactId, defaultDealId, defaultCurrency, form]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open && !fromQuoteId) {
      // Prefill logic: if from deal only (not fromQuoteId), create one standard line
      const initialLines = defaultDealId
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
        fromQuoteId: "",
        currency: (defaultCurrency as "DKK" | "EUR" | "USD") || "DKK",
        taxPct: defaultTaxPct || 25,
        discountPct: 0,
        orderDate: format(new Date(), "yyyy-MM-dd"),
        deliveryDate: defaultDeliveryDate || "",
        notes: defaultNotes || "",
        lines: initialLines,
      });
    }
  }, [open, defaultCompanyId, defaultContactId, defaultDealId, defaultCurrency, fromQuoteId, expectedValueMinor, form]);

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
      const order = await createOrder.mutateAsync({
        number: "", // Auto-generated
        status: "draft",
        currency: data.currency,
        order_date: new Date(data.orderDate).toISOString(),
        delivery_date: data.deliveryDate ? new Date(data.deliveryDate).toISOString() : null,
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
          tax_rate_pct: line.taxRatePct,
          discount_pct: line.discountPct,
        })),
      });

      // Log activity
      try {
        await logActivity({
          type: "order_created",
          dealId: data.dealId || null,
          meta: {
            orderId: order.id,
            companyId: data.companyId,
            fromQuoteId: data.fromQuoteId || null,
          },
        });
      } catch (error) {
        logger.error("Failed to log activity:", error);
      }

      // Call onSuccess callback if provided (for automation)
      if (onSuccess) {
        onSuccess(order);
      } else {
        // Default behavior: show toast and navigate
        toastBus.emit({ title: t("order_created") });
        onOpenChange(false);
        navigate(`/orders/${order.id}`);
      }
    } catch (error) {
      logger.error("Failed to create order:", error);
      toastBus.emit({
        title: "Failed to create order",
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

  const duplicateLine = (index: number) => {
    const lineToDuplicate = fields[index];
    append({
      description: lineToDuplicate.description,
      qty: lineToDuplicate.qty,
      unitMinor: lineToDuplicate.unitMinor,
      taxRatePct: lineToDuplicate.taxRatePct || 25,
      discountPct: lineToDuplicate.discountPct,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AccessibleDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
            <DialogDescription>Fill in the fields below. Pre-filled from deal.</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("order_details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t("company")}</label>
                    <CompanySelect
                      value={form.watch("companyId")}
                      onChange={(value) => form.setValue("companyId", value)}
                      onCreateRequested={handleCreateCompany}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t("contact")}</label>
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
                    <label className="text-sm font-medium">{t("currency")}</label>
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
                    <label className="text-sm font-medium">{t("discount_pct")}</label>
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
                    <label className="text-sm font-medium">{t("order_date")}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("orderDate") ? format(new Date(form.watch("orderDate")), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("orderDate") ? new Date(form.watch("orderDate")) : undefined}
                          onSelect={(date) => form.setValue("orderDate", date ? format(date, "yyyy-MM-dd") : "")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t("delivery_date")} (Optional)</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("deliveryDate") ? format(new Date(form.watch("deliveryDate") || ""), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("deliveryDate") ? new Date(form.watch("deliveryDate") || "") : undefined}
                          onSelect={(date) => form.setValue("deliveryDate", date ? format(date, "yyyy-MM-dd") : "")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">{t("notes")}</label>
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
                <CardTitle className="text-lg">{t("line_items")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[auto_80px_120px_80px_80px_80px] md:grid-cols-[auto_100px_140px_100px_100px_100px] gap-2 items-center">
                      <Input
                        {...form.register(`lines.${index}.description`)}
                        placeholder={t("description")}
                        className="col-span-1"
                      />
                      <Input
                        type="number"
                        {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                        placeholder={t("qty")}
                        className="col-span-1"
                      />
                      <Input
                        type="number"
                        {...form.register(`lines.${index}.unitMinor`, { valueAsNumber: true })}
                        placeholder={t("unit_minor")}
                        className="col-span-1"
                      />
                      <Input
                        type="number"
                        {...form.register(`lines.${index}.taxRatePct`, { valueAsNumber: true })}
                        placeholder="VAT %"
                        className="col-span-1"
                      />
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateLine(index)}
                          aria-label={`Duplicate line ${index + 1}`}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={fields.length === 1}
                          aria-label={`${t("remove")} line ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
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
                  {t("add_line")}
                </Button>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("subtotal")}:</span>
                    <span className="font-medium">{formatMoneyMinor(totals.subtotalMinor, form.watch("currency"))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT:</span>
                    <span className="font-medium">{formatMoneyMinor(totals.taxMinor, form.watch("currency"))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>{t("total")}:</span>
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
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createOrder.isPending || !form.formState.isValid}
                aria-busy={createOrder.isPending}
              >
                {createOrder.isPending ? t("creating_order") : t("create_order")}
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
          last_name: pendingPersonName.split(" ").slice(1).join(" ") || "",
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

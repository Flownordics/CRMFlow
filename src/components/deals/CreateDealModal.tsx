import { useState, useEffect } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCreateDeal } from "@/services/deals";
import { toastBus } from "@/lib/toastBus";
import { FormRow } from "@/components/forms/FormRow";
import { useI18n } from "@/lib/i18n";
import { toMinor, fromMinor } from "@/lib/money";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { CompanySelect } from "@/components/selects/CompanySelect";
import { PersonSelect } from "@/components/selects/PersonSelect";
import { CompanyModal } from "@/components/companies/CompanyModal";
import { PersonModal } from "@/components/people/PersonModal";
import { useCreateCompany } from "@/services/companies";
import { useCreatePerson } from "@/services/people";
import { CompanyCreate } from "@/lib/schemas/company";
import { PersonCreate } from "@/lib/schemas/person";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePipelines } from "@/services/pipelines";

export function CreateDealModal({
  open,
  onOpenChange,
  defaultStageId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultStageId?: string;
}) {
  const { t } = useI18n();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState<string>("all");
  const [contactId, setContactId] = useState<string>("");
  const [currency, setCurrency] = useState("DKK");
  const [taxPct, setTaxPct] = useState<number>(25);
  const [expectedValue, setExpectedValue] = useState<number>(0); // gemmes som minor
  const [closeDate, setCloseDate] = useState<Date | null>(null);
  const [stageId, setStageId] = useState<string>(defaultStageId || "");
  const [ownerUserId, setOwnerUserId] = useState<string>(user?.id || "");

  // Modal states for inline creation
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [pendingCompanyName, setPendingCompanyName] = useState("");
  const [pendingPersonName, setPendingPersonName] = useState("");

  const createDeal = useCreateDeal();
  const createCompany = useCreateCompany();
  const createPerson = useCreatePerson();
  const { data: pipelines } = usePipelines();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setCompanyId("all");
      setContactId("");
      setCurrency("DKK");
      setTaxPct(25);
      setExpectedValue(0);
      setCloseDate(null);
      setOwnerUserId(user?.id || "");
      setPendingCompanyName("");
      setPendingPersonName("");
    }
  }, [open, user?.id]);

  // Reset stage when defaultStageId changes or set default stage
  useEffect(() => {
    if (defaultStageId) {
      setStageId(defaultStageId);
    } else if (pipelines && pipelines.length > 0 && pipelines[0].stages.length > 0) {
      // Set first stage as default if no defaultStageId provided
      setStageId(pipelines[0].stages[0].id);
    }
  }, [defaultStageId, pipelines]);

  // Update owner when user changes
  useEffect(() => {
    if (user?.id && !ownerUserId) {
      setOwnerUserId(user.id);
    }
  }, [user?.id, ownerUserId]);

  const handleCreateCompany = (companyName: string) => {
    setPendingCompanyName(companyName);
    setCompanyModalOpen(true);
  };

  const handleCreatePerson = (personName: string) => {
    setPendingPersonName(personName);
    setPersonModalOpen(true);
  };

  const handleCompanyCreated = (company: any) => {
    setCompanyId(company.id);
    setCompanyModalOpen(false);
    setPendingCompanyName("");
    toastBus.emit({
      title: "Company created",
      description: `Company "${company.name}" has been created successfully`
    });
  };

  const handlePersonCreated = (person: any) => {
    setContactId(person.id);
    setPersonModalOpen(false);
    setPendingPersonName("");
    toastBus.emit({
      title: "Person created",
      description: `Contact "${person.firstName} ${person.lastName}" has been created successfully`
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AccessibleDialogContent
          className="sm:max-w-lg"
        >
          {/* 🔒 These must render on the very first paint, unconditionally */}
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
            <DialogDescription>Create a new deal with company, contact, and financial details</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <FormRow label="Title" control={<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deal title" />} />

            <FormRow label="Company" control={
              <CompanySelect
                value={companyId}
                onChange={setCompanyId}
                onCreateRequested={handleCreateCompany}
              />
            } />

            <FormRow label="Contact" control={
              <PersonSelect
                companyId={companyId === "all" ? undefined : companyId}
                value={contactId}
                onChange={setContactId}
                onCreateRequested={handleCreatePerson}
              />
            } />

            <FormRow label="Expected Value" control={
              <Input
                type="number"
                min="0"
                step="1"
                value={expectedValue}
                onChange={(e) => setExpectedValue(Number(e.target.value || 0))}
                placeholder="50000"
              />
            } />

            <FormRow label="Owner" control={
              <Input
                type="text"
                value={ownerUserId || ""}
                onChange={(e) => setOwnerUserId(e.target.value)}
                placeholder="Owner User ID"
                disabled
              />
            } />

            <FormRow label={t("close_date")} control={
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {closeDate ? format(closeDate, "PPP") : <span>{t("pick_a_date")}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={closeDate ?? undefined}
                    onSelect={(d) => setCloseDate(d ?? null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            } />

            <FormRow label="Stage" control={
              <Select value={stageId || ""} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {pipelines && pipelines.length > 0 && pipelines[0].stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            } />

            <FormRow label="Currency" control={
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DKK">DKK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            } />

            <FormRow label="Tax %" control={
              <Input type="number" min={0} max={100} step={0.1} value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value || 0))} />
            } />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (title.trim() && stageId && stageId.trim()) {
                  const validStageId: string = stageId;
                  createDeal.mutate({
                    title: title.trim(),
                    stage_id: validStageId,
                    company_id: companyId === "all" ? undefined : companyId,
                    contact_id: contactId || undefined,
                    currency,
                    expected_value_minor: toMinor(expectedValue),
                    close_date: closeDate?.toISOString().split('T')[0] ?? null,
                    owner_user_id: ownerUserId || null,
                  }, {
                    onSuccess: () => {
                      toastBus.emit({
                        title: "Deal created",
                        description: "Deal has been created successfully"
                      });
                      onOpenChange(false);
                    }
                  });
                }
              }}
              disabled={!title.trim() || !stageId || createDeal.isPending}
            >
              {createDeal.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </AccessibleDialogContent>
      </Dialog>

      {/* Inline Company Creation Modal */}
      <CompanyModal
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        onSuccess={handleCompanyCreated}
        defaultValues={pendingCompanyName ? { name: pendingCompanyName } : undefined}
      />

      {/* Inline Person Creation Modal */}
      <PersonModal
        open={personModalOpen}
        onOpenChange={setPersonModalOpen}
        companyId={companyId === "all" ? undefined : companyId}
        onSuccess={handlePersonCreated}
      />
    </>
  );
}

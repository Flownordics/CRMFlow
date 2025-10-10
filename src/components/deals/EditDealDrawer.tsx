import { useState, useEffect } from "react";
import { Deal } from "@/services/deals";
import { Stage } from "@/services/pipelines";
import { useUpdateDeal, useDeleteDeal } from "@/services/deals";
import { useCompany } from "@/services/companies";
import { usePerson } from "@/services/people";
import { logDealUpdated, logDealDeleted } from "@/services/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatMoneyMinor } from "@/lib/money";
import { toastBus } from "@/lib/toastBus";
import { PersonSelect } from "@/components/selects/PersonSelect";
import { PersonModal } from "@/components/people/PersonModal";
import { logger } from '@/lib/logger';

interface EditDealDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deal: Deal | null;
    stages: Stage[];
    stageProbPctById: Record<string, number>;
}

export function EditDealDrawer({ open, onOpenChange, deal, stages, stageProbPctById }: EditDealDrawerProps) {
    const [formData, setFormData] = useState<Partial<Deal>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [pendingPersonName, setPendingPersonName] = useState("");

    const updateDealMutation = useUpdateDeal();
    const deleteDealMutation = useDeleteDeal();


    // Fetch company data for display
    const { data: company, isLoading: companyLoading } = useCompany(deal?.company_id || "");



    // Initialize form data when deal changes
    useEffect(() => {
        if (deal) {
            const defaultProbability = deal.probability ?? stageProbPctById[deal.stage_id] ?? 50;
            setFormData({
                title: deal.title,
                company_id: deal.company_id,
                contact_id: deal.contact_id,
                stage_id: deal.stage_id,
                expected_value_minor: deal.expected_value_minor,
                close_date: deal.close_date,
                probability: defaultProbability / 100, // Convert to 0-1 range
                currency: deal.currency,
            });
            setTouched({});
        }
    }, [deal, stageProbPctById]);

    // Handle stage change - update probability if not manually touched
    const handleStageChange = (stageId: string) => {
        setFormData(prev => ({ ...prev, stage_id: stageId }));

        // If probability hasn't been manually touched, update to stage default
        if (!touched.probability) {
            const stageDefaultProb = stageProbPctById[stageId] ?? 50;
            setFormData(prev => ({ ...prev, probability: stageDefaultProb / 100 }));
        }
    };

    // Handle probability change
    const handleProbabilityChange = (value: number[]) => {
        const probValue = value[0] / 100; // Convert from 0-100 to 0-1
        setFormData(prev => ({ ...prev, probability: probValue }));
        setTouched(prev => ({ ...prev, probability: true }));
    };

    // Handle expected value change (convert to minor units)
    const handleExpectedValueChange = (value: string) => {
        const numericValue = parseFloat(value) || 0;
        const minorValue = Math.round(numericValue * 100); // Convert to minor units
        setFormData(prev => ({ ...prev, expected_value_minor: minorValue }));
    };

    // Handle contact creation
    const handleCreatePerson = (personName: string) => {
        setPendingPersonName(personName);
        setPersonModalOpen(true);
    };

    const handlePersonCreated = (person: any) => {
        setFormData(prev => ({ ...prev, contact_id: person.id }));
        setPersonModalOpen(false);
        setPendingPersonName("");
        toastBus.emit({
            title: "Person created",
            description: `Contact "${person.firstName} ${person.lastName}" has been created successfully`
        });
    };

    // Get current probability percentage for display
    const currentProbPct = Math.round((formData.probability ?? 0) * 100);
    const stageDefaultProbPct = deal ? (stageProbPctById[deal.stage_id] ?? 50) : 50;

    // Calculate what fields have changed
    const getChangedFields = (): string[] => {
        if (!deal) return [];

        const changed: string[] = [];
        if (formData.title !== deal.title) changed.push('title');
        if (formData.stage_id !== deal.stage_id) changed.push('stage');
        if (formData.expected_value_minor !== deal.expected_value_minor) changed.push('expected_value');
        if (formData.close_date !== deal.close_date) changed.push('close_date');
        if (formData.probability !== deal.probability) changed.push('probability');
        if (formData.currency !== deal.currency) changed.push('currency');
        if (formData.contact_id !== deal.contact_id) changed.push('contact');

        return changed;
    };

    // Handle save
    const handleSave = async () => {
        if (!deal) return;

        setIsSubmitting(true);
        try {
            const changedFields = getChangedFields();
            if (changedFields.length === 0) {
                onOpenChange(false);
                return;
            }

            await updateDealMutation.mutateAsync({ id: deal.id, patch: formData });

            // Log activity
            await logDealUpdated(deal.id, changedFields);

            toastBus.emit({ title: "Success", description: "Deal updated successfully", variant: "success" });
            onOpenChange(false);
        } catch (error) {
            logger.error("Failed to update deal:", error);
            toastBus.emit({ title: "Error", description: "Failed to update deal", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deal) return;

        try {
            await deleteDealMutation.mutateAsync(deal.id);

            // Log activity
            await logDealDeleted(deal.id);

            toastBus.emit({ title: "Success", description: "Deal deleted successfully", variant: "success" });
            onOpenChange(false);
            setShowDeleteConfirm(false);
        } catch (error) {
            logger.error("Failed to delete deal:", error);
            toastBus.emit({ title: "Error", description: "Failed to delete deal", variant: "destructive" });
        }
    };

    // Don't render if no deal is selected
    if (!deal) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <AccessibleDialogContent
                    className="sm:max-w-[500px]"
                >
                    {/* 🔒 These must render on the very first paint, unconditionally */}
                    <DialogHeader>
                        <DialogTitle>Edit Deal</DialogTitle>
                        <DialogDescription>Update deal information and probability</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Title */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Deal title"
                                autoFocus
                            />
                        </div>

                        {/* Company (read-only for now) */}
                        <div className="grid gap-2">
                            <Label htmlFor="company">Company</Label>
                            <Input
                                id="company"
                                value={companyLoading ? "Loading..." : (company?.name || "No company assigned")}
                                disabled
                                placeholder="Company (read-only)"
                            />
                        </div>

                        {/* Contact (editable) */}
                        <div className="grid gap-2">
                            <Label htmlFor="contact">Contact</Label>
                            <PersonSelect
                                companyId={formData.company_id}
                                value={formData.contact_id || ""}
                                onChange={(contactId) => setFormData(prev => ({ ...prev, contact_id: contactId }))}
                                onCreateRequested={handleCreatePerson}
                            />
                        </div>

                        {/* Stage */}
                        <div className="grid gap-2">
                            <Label htmlFor="stage">Stage</Label>
                            <Select value={formData.stage_id || ""} onValueChange={handleStageChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Expected Value */}
                        <div className="grid gap-2">
                            <Label htmlFor="expected-value">Expected Value</Label>
                            <Input
                                id="expected-value"
                                type="number"
                                step="0.01"
                                value={((formData.expected_value_minor || 0) / 100).toFixed(2)}
                                onChange={(e) => handleExpectedValueChange(e.target.value)}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-muted-foreground">
                                Stored in øre (minor); displayed as kr.
                            </p>
                        </div>

                        {/* Close Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="close-date">Close Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !formData.close_date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.close_date ? format(new Date(formData.close_date), "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.close_date ? new Date(formData.close_date) : undefined}
                                        onSelect={(date) => setFormData(prev => ({
                                            ...prev,
                                            close_date: date ? date.toISOString().split('T')[0] : null
                                        }))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Probability */}
                        <div className="grid gap-2">
                            <Label htmlFor="probability">
                                Probability: {currentProbPct}%
                                {!touched.probability && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                        (Stage default: {stageDefaultProbPct}%)
                                    </span>
                                )}
                            </Label>
                            <Slider
                                id="probability"
                                value={[currentProbPct]}
                                onValueChange={handleProbabilityChange}
                                max={100}
                                min={0}
                                step={1}
                                className="w-full"
                            />
                        </div>

                        {/* Currency */}
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Select
                                value={formData.currency || "DKK"}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DKK">DKK</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between">
                        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" type="button">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the deal
                                        "{deal.title}".
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting || !formData.title}
                            >
                                {isSubmitting ? "Saving..." : "Save changes"}
                            </Button>
                        </div>
                    </DialogFooter>
                </AccessibleDialogContent>
            </Dialog>

            {/* Inline Person Creation Modal */}
            <PersonModal
                open={personModalOpen}
                onOpenChange={setPersonModalOpen}
                companyId={formData.company_id}
                onSuccess={handlePersonCreated}
                defaultValues={pendingPersonName ? { firstName: pendingPersonName } : undefined}
            />
        </>
    );
}

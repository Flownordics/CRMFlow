import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { useCreateEvent, CreateEventPayload } from "@/services/events";
// Google integration removed - starting fresh
import { toastBus } from "@/lib/toastBus";
import { logEventActivity } from "@/services/activity";
import { MapPin, User, Database } from "lucide-react";
import { CompanySelect } from "@/components/selects/CompanySelect";
import { SearchSelect } from "@/components/selects/SearchSelect";
import { useI18n } from "@/lib/i18n";
import { searchDeals } from "@/services/deals";
import { searchQuotes } from "@/services/quotes";
import { searchOrders } from "@/services/orders";
import { logger } from '@/lib/logger';

interface CreateEventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEventCreated: () => void;
    showGoogleLayer?: boolean;
    isGoogleConnected?: boolean;
    defaultCompanyId?: string;
    defaultTitle?: string;
}

export function CreateEventDialog({
    open,
    onOpenChange,
    onEventCreated,
    showGoogleLayer = false,
    isGoogleConnected = false,
    defaultCompanyId,
    defaultTitle,
}: CreateEventDialogProps) {
    const { t } = useI18n();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");
    const [allDay, setAllDay] = useState(false);
    const [attendees, setAttendees] = useState("");
    const [selectedDealId, setSelectedDealId] = useState<string>("");
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
    const [selectedOrderId, setSelectedOrderId] = useState<string>("");
    const [syncToGoogle, setSyncToGoogle] = useState(true);
    const [eventKind, setEventKind] = useState<"meeting" | "call" | "deadline" | "other">("meeting");
    const [eventColor, setEventColor] = useState<"primary" | "accent" | "warning" | "success" | "muted">("primary");
    // Google integration removed - starting fresh

    const createNativeEvent = useCreateEvent();
    // Google integration removed - starting fresh

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !startDate || !endDate) {
            toastBus.emit({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        // Prevent double submission
        if (createNativeEvent.isPending) {
            return;
        }

        try {
            // Convert Danish time to UTC for storage
            // Create ISO string with explicit timezone offset for Danish time
            const convertToUTC = (date: string, time?: string): string => {
                if (allDay || !time) {
                    // For all-day events, store as UTC midnight
                    return `${date}T00:00:00.000Z`;
                } else {
                    // Parse as local (Danish) time and convert to UTC
                    // new Date() automatically parses as local time
                    const localDate = new Date(`${date}T${time}:00`);
                    // toISOString() automatically converts to UTC
                    return localDate.toISOString();
                }
            };

            const startDateTime = convertToUTC(startDate, startTime);
            const endDateTime = allDay && !endTime
                ? convertToUTC(endDate, '23:59')
                : convertToUTC(endDate, endTime);

            // Parse attendees
            const attendeesList = attendees.trim()
                ? attendees.split(',').map(email => ({
                    email: email.trim(),
                    name: email.trim().split('@')[0],
                    optional: false
                }))
                : [];

            // Create native event first
            const nativePayload: CreateEventPayload = {
                title: title.trim(),
                description: description.trim() || undefined,
                start_at: startDateTime,
                end_at: endDateTime,
                all_day: allDay,
                location: location.trim() || undefined,
                attendees: attendeesList,
                color: eventColor,
                kind: eventKind,
                ...(selectedDealId && { deal_id: selectedDealId }),
                ...(selectedCompanyId && { company_id: selectedCompanyId }),
                ...(selectedQuoteId && { quote_id: selectedQuoteId }),
                ...(selectedOrderId && { order_id: selectedOrderId }),
                google_sync_enabled: syncToGoogle,
            };

            const nativeEvent = await createNativeEvent.mutateAsync(nativePayload);

            // Log calendar event creation
            try {
                await logEventActivity('created', nativeEvent.id, {
                    dealId: selectedDealId || undefined,
                    companyId: selectedCompanyId || undefined,
                    quoteId: selectedQuoteId || undefined,
                    orderId: selectedOrderId || undefined,
                    kind: eventKind,
                    title: title.trim()
                });
            } catch (activityError) {
                logger.warn('Failed to log calendar activity:', activityError);
            }

            // Google integration removed - starting fresh

            // Reset form
            resetForm();

            // Close dialog and notify parent
            onOpenChange(false);
            onEventCreated();

            toastBus.emit({
                title: "Event Created",
                description: "Your calendar event has been created successfully",
                variant: "success"
            });
        } catch (error) {
            logger.error('Error creating event:', error);
            toastBus.emit({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create event",
                variant: "destructive"
            });
            // Don't close dialog on error so user can retry
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setLocation("");
        setStartDate("");
        setStartTime("");
        setEndDate("");
        setEndTime("");
        setAllDay(false);
        setAttendees("");
        setSelectedDealId("");
        setSelectedCompanyId("");
        setSelectedQuoteId("");
        setSelectedOrderId("");
        setEventKind("meeting");
        setEventColor("primary");
        // Google integration removed - starting fresh
    };

    const handleCancel = () => {
        resetForm();
        onOpenChange(false);
    };

    // Set default dates and values when dialog opens
    useEffect(() => {
        if (open) {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            setStartDate(now.toISOString().split('T')[0]);
            setStartTime(now.toTimeString().slice(0, 5));
            setEndDate(tomorrow.toISOString().split('T')[0]);
            setEndTime(now.toTimeString().slice(0, 5));
            
            // Set default values from props
            if (defaultCompanyId) {
                setSelectedCompanyId(defaultCompanyId);
            }
            if (defaultTitle) {
                setTitle(defaultTitle);
            }
        } else {
            // Reset form when dialog closes
            resetForm();
        }
    }, [open, defaultCompanyId, defaultTitle]);

    const isLoading = createNativeEvent.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AccessibleDialogContent
                className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
            >
                {/* 🔒 These must render on the very first paint, unconditionally */}
                <DialogHeader>
                    <DialogTitle>{t('create_event') || "Create Event"}</DialogTitle>
                    <DialogDescription>Create a new event in your native calendar</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Event Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Meeting with client"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Event details and agenda..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">{t('location')}</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Office, Zoom, or physical address"
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="allDay"
                            checked={allDay}
                            onCheckedChange={(checked) => setAllDay(checked as boolean)}
                        />
                        <Label htmlFor="allDay">{t('all_day')}</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="eventDate">Date *</Label>
                        <Input
                            id="eventDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setEndDate(e.target.value);
                            }}
                            required
                        />
                    </div>

                    {!allDay && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Start Time</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    step="300"
                                />
                                <p className="text-xs text-muted-foreground">5 minute intervals</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">End Time</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    step="300"
                                />
                                <p className="text-xs text-muted-foreground">5 minute intervals</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="attendees">{t('attendees')}</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="attendees"
                                value={attendees}
                                onChange={(e) => setAttendees(e.target.value)}
                                placeholder="email1@example.com, email2@example.com"
                                className="pl-10"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Separate multiple email addresses with commas
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="eventKind">Event Type</Label>
                            <select
                                id="eventKind"
                                value={eventKind}
                                onChange={(e) => setEventKind(e.target.value as any)}
                                className="w-full px-3 py-2 border border-input rounded-md"
                            >
                                <option value="meeting">{t('meeting')}</option>
                                <option value="call">{t('call')}</option>
                                <option value="deadline">{t('deadline')}</option>
                                <option value="other">{t('other')}</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="eventColor">Color</Label>
                            <select
                                id="eventColor"
                                value={eventColor}
                                onChange={(e) => setEventColor(e.target.value as any)}
                                className="w-full px-3 py-2 border border-input rounded-md"
                            >
                                <option value="primary">{t('primary')}</option>
                                <option value="accent">{t('accent')}</option>
                                <option value="warning">{t('warning')}</option>
                                <option value="success">{t('success')}</option>
                                <option value="muted">{t('muted')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Google Calendar Sync */}
                    {showGoogleLayer && isGoogleConnected && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="syncToGoogle"
                                checked={syncToGoogle}
                                onCheckedChange={(checked) => setSyncToGoogle(checked as boolean)}
                            />
                            <Label htmlFor="syncToGoogle">Sync to Google Calendar</Label>
                        </div>
                    )}

                    {/* CRM Linking Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium">{t('link_to')} CRM</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company">{t('company')}</Label>
                                <CompanySelect
                                    value={selectedCompanyId}
                                    onChange={setSelectedCompanyId}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deal">{t('deal')}</Label>
                                <SearchSelect
                                    value={selectedDealId}
                                    onChange={setSelectedDealId}
                                    onSearch={(query) => searchDeals(query, selectedCompanyId)}
                                    placeholder="Search deals..."
                                    emptyMessage={selectedCompanyId ? "No deals found for this company" : "No deals found"}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quote">{t('quote')}</Label>
                                <SearchSelect
                                    value={selectedQuoteId}
                                    onChange={setSelectedQuoteId}
                                    onSearch={(query) => searchQuotes(query, selectedCompanyId)}
                                    placeholder="Search quotes..."
                                    emptyMessage={selectedCompanyId ? "No quotes found for this company" : "No quotes found"}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="order">{t('order')}</Label>
                                <SearchSelect
                                    value={selectedOrderId}
                                    onChange={setSelectedOrderId}
                                    onSearch={(query) => searchOrders(query, selectedCompanyId)}
                                    placeholder="Search orders..."
                                    emptyMessage={selectedCompanyId ? "No orders found for this company" : "No orders found"}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Google integration removed - starting fresh */}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !title.trim() || !startDate || !endDate}
                            className="flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Database className="h-4 w-4" />
                                    {t('create_event')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}

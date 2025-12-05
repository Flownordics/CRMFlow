import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { useUpdateEvent, useDeleteEvent } from "@/services/events";
import { toastBus } from "@/lib/toastBus";
import { logEventActivity } from "@/services/activity";
import { MapPin, User, Database } from "lucide-react";
import { CompanySelect } from "@/components/selects/CompanySelect";
import { SearchSelect } from "@/components/selects/SearchSelect";
import { useI18n } from "@/lib/i18n";
import { searchDeals } from "@/services/deals";
import { searchQuotes } from "@/services/quotes";
import { searchOrders } from "@/services/orders";
import { MergedEvent } from "@/lib/calendar-utils";
import { logger } from '@/lib/logger';
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface EditEventDialogProps {
    event: MergedEvent;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEventUpdated?: () => void;
}

export function EditEventDialog({ event, open, onOpenChange, onEventUpdated }: EditEventDialogProps) {
    const { t } = useI18n();
    const updateEvent = useUpdateEvent();
    const deleteEvent = useDeleteEvent();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form state
    const [title, setTitle] = useState(event.title || "");
    const [description, setDescription] = useState(event.description || "");
    const [location, setLocation] = useState(event.location || "");
    const [allDay, setAllDay] = useState(event.all_day || false);
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");
    const [eventKind, setEventKind] = useState(event.kind || "meeting");
    const [eventColor, setEventColor] = useState(event.color || "primary");
    const [attendees, setAttendees] = useState(event.attendees?.map(a => a.email).join(", ") || "");
    const [syncToGoogle, setSyncToGoogle] = useState(event.sync_state !== 'none');

    // CRM relations
    const [selectedCompanyId, setSelectedCompanyId] = useState(event.company_id || "");
    const [selectedDealId, setSelectedDealId] = useState(event.deal_id || "");
    const [selectedQuoteId, setSelectedQuoteId] = useState(event.quote_id || "");
    const [selectedOrderId, setSelectedOrderId] = useState(event.order_id || "");

    // Initialize form with event data
    useEffect(() => {
        if (event) {
            setTitle(event.title || "");
            setDescription(event.description || "");
            setLocation(event.location || "");
            setAllDay(event.all_day || false);
            setEventKind(event.kind || "meeting");
            setEventColor(event.color || "primary");
            setAttendees(event.attendees?.map(a => a.email).join(", ") || "");
            setSyncToGoogle(event.sync_state !== 'none');
            setSelectedCompanyId(event.company_id || "");
            setSelectedDealId(event.deal_id || "");
            setSelectedQuoteId(event.quote_id || "");
            setSelectedOrderId(event.order_id || "");

            // Parse dates - convert from UTC to local Danish time for display
            const startDate = new Date(event.start_at);
            const endDate = new Date(event.end_at);

            // Format date as YYYY-MM-DD in local time
            const formatDateLocal = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            setStartDate(formatDateLocal(startDate));
            setEndDate(formatDateLocal(endDate));

            if (!event.all_day) {
                const formatTimeLocal = (date: Date) => {
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${hours}:${minutes}`;
                };
                setStartTime(formatTimeLocal(startDate));
                setEndTime(formatTimeLocal(endDate));
            }
        }
    }, [event]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toastBus.emit({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        // Prevent double submission
        if (updateEvent.isPending) {
            return;
        }

        try {
            // Convert Danish time to UTC for storage
            const convertToUTC = (date: string, time?: string): string => {
                if (allDay || !time) {
                    // For all-day events, store as UTC midnight
                    return `${date}T00:00:00.000Z`;
                } else {
                    // Parse as local (Danish) time and convert to UTC
                    const localDate = new Date(`${date}T${time}:00`);
                    return localDate.toISOString();
                }
            };

            const startDateTime = convertToUTC(startDate, startTime);
            const endDateTime = allDay && !endTime
                ? convertToUTC(endDate, '23:59')
                : convertToUTC(endDate, endTime);

            // Parse attendees
            const attendeesList = attendees.trim()
                ? attendees.split(",").map(email => ({
                    email: email.trim(),
                    name: email.trim().split('@')[0],
                    optional: false
                }))
                : [];

            // Create update payload
            const updatePayload = {
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

            await updateEvent.mutateAsync({ id: event.id, payload: updatePayload });

            // Log event update
            try {
                await logEventActivity({
                    event_type: 'event_updated',
                    entity_type: 'event',
                    entity_id: event.id,
                    details: {
                        title: title.trim(),
                        kind: eventKind,
                        company_id: selectedCompanyId || null,
                        deal_id: selectedDealId || null,
                        quote_id: selectedQuoteId || null,
                        order_id: selectedOrderId || null,
                    }
                });
            } catch (activityError) {
                logger.warn('Failed to log event update activity:', activityError);
            }

            toastBus.emit({
                title: "Event Updated",
                description: "Your calendar event has been updated successfully",
                variant: "success"
            });

            onOpenChange(false);
            onEventUpdated?.();
        } catch (error) {
            logger.error('Failed to update event:', error);
            toastBus.emit({
                title: "Error",
                description: "Failed to update event. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async () => {
        try {
            await deleteEvent.mutateAsync(event.id);

            // Log event deletion
            try {
                await logEventActivity({
                    event_type: 'event_deleted',
                    entity_type: 'event',
                    entity_id: event.id,
                    details: {
                        title: event.title,
                        kind: event.kind,
                    }
                });
            } catch (activityError) {
                logger.warn('Failed to log event deletion activity:', activityError);
            }

            toastBus.emit({
                title: "Event Deleted",
                description: "Your calendar event has been deleted successfully",
                variant: "success"
            });

            setShowDeleteConfirm(false);
            onOpenChange(false);
            onEventUpdated?.();
        } catch (error) {
            logger.error('Failed to delete event:', error);
            toastBus.emit({
                title: "Error",
                description: "Failed to delete event. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AccessibleDialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Event</DialogTitle>
                    <DialogDescription>
                        Update your calendar event details and sync settings.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title */}
                        <div className="md:col-span-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Event title"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Event description"
                                rows={3}
                            />
                        </div>

                        {/* Event Type */}
                        <div>
                            <Label htmlFor="kind">Event Type</Label>
                            <Select value={eventKind} onValueChange={setEventKind}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="call">Call</SelectItem>
                                    <SelectItem value="deadline">Deadline</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Color */}
                        <div>
                            <Label htmlFor="color">Color</Label>
                            <Select value={eventColor} onValueChange={setEventColor}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="primary">Primary</SelectItem>
                                    <SelectItem value="accent">Accent</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                    <SelectItem value="muted">Muted</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* All Day */}
                        <div className="md:col-span-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="allDay"
                                    checked={allDay}
                                    onCheckedChange={setAllDay}
                                />
                                <Label htmlFor="allDay">All day event</Label>
                            </div>
                        </div>

                        {/* Start Date */}
                        <div>
                            <Label htmlFor="startDate">Start Date *</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>

                        {/* Start Time */}
                        {!allDay && (
                            <div>
                                <Label htmlFor="startTime">Start Time *</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {/* End Date */}
                        <div>
                            <Label htmlFor="endDate">End Date *</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>

                        {/* End Time */}
                        {!allDay && (
                            <div>
                                <Label htmlFor="endTime">End Time *</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {/* Location */}
                        <div className="md:col-span-2">
                            <Label htmlFor="location">Location</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="location"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Event location"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Attendees */}
                        <div className="md:col-span-2">
                            <Label htmlFor="attendees">Attendees</Label>
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
                        </div>

                        {/* Company */}
                        <div className="md:col-span-2">
                            <Label>Company</Label>
                            <CompanySelect
                                value={selectedCompanyId}
                                onChange={setSelectedCompanyId}
                            />
                        </div>

                        {/* Deal */}
                        <div className="md:col-span-2">
                            <Label>Deal</Label>
                            <SearchSelect
                                value={selectedDealId}
                                onChange={setSelectedDealId}
                                onSearch={searchDeals}
                                placeholder="Search deals..."
                                emptyMessage="No deals found"
                            />
                        </div>

                        {/* Quote */}
                        <div className="md:col-span-2">
                            <Label>Quote</Label>
                            <SearchSelect
                                value={selectedQuoteId}
                                onChange={setSelectedQuoteId}
                                onSearch={searchQuotes}
                                placeholder="Search quotes..."
                                emptyMessage="No quotes found"
                            />
                        </div>

                        {/* Order */}
                        <div className="md:col-span-2">
                            <Label>Order</Label>
                            <SearchSelect
                                value={selectedOrderId}
                                onChange={setSelectedOrderId}
                                onSearch={searchOrders}
                                placeholder="Search orders..."
                                emptyMessage="No orders found"
                            />
                        </div>

                        {/* Google Sync */}
                        <div className="md:col-span-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="syncToGoogle"
                                    checked={syncToGoogle}
                                    onCheckedChange={setSyncToGoogle}
                                />
                                <Label htmlFor="syncToGoogle">Sync to Google Calendar</Label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={updateEvent.isPending || deleteEvent.isPending}
                        >
                            Delete Event
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateEvent.isPending || deleteEvent.isPending}
                            >
                                {updateEvent.isPending ? "Updating..." : "Update Event"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
        {showDeleteConfirm && (
            <ConfirmationDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Delete Event"
                description="This event will be deleted permanently. This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                variant="destructive"
            />
        )}
        </>
    );
}

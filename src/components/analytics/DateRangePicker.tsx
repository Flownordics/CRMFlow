import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "@/services/analytics";

interface DateRangePickerProps {
    value?: DateRange;
    onChange: (range: DateRange | undefined) => void;
    placeholder?: string;
}

export function DateRangePicker({ value, onChange, placeholder = "Select date range" }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
        if (range?.from && range?.to) {
            onChange({
                start: range.from,
                end: range.to,
            });
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        onChange(undefined);
        setIsOpen(false);
    };

    const formatDateRange = (range: DateRange) => {
        return `${format(range.start, "MMM dd, yyyy")} - ${format(range.end, "MMM dd, yyyy")}`;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <Calendar className="mr-2 h-4 w-4" />
                    {value ? formatDateRange(value) : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                    <CalendarComponent
                        mode="range"
                        selected={{
                            from: value?.start,
                            to: value?.end,
                        }}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        className="rounded-md border"
                    />
                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={handleClear}>
                            Clear
                        </Button>
                        <Button size="sm" onClick={() => setIsOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

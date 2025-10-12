import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfQuarter, 
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear
} from "date-fns";

export type DateRangePreset = 'today' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  preset: DateRangePreset;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const presets: { value: DateRangePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'this-year', label: 'This Year' },
  ];

  const handlePresetChange = (preset: DateRangePreset) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'this-week':
        from = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'this-month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'this-quarter':
        from = startOfQuarter(now);
        to = endOfQuarter(now);
        break;
      case 'this-year':
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      default:
        return;
    }

    onChange({ from, to, preset });

    // Save to localStorage
    localStorage.setItem('dashboard-date-range', JSON.stringify({ preset }));
  };

  const currentLabel = presets.find(p => p.value === value.preset)?.label || 'Select Range';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
          {currentLabel}
          <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={value.preset === preset.value ? 'bg-accent' : ''}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to get initial date range from localStorage or default to this month
export function getInitialDateRange(): DateRange {
  try {
    const saved = localStorage.getItem('dashboard-date-range');
    if (saved) {
      const { preset } = JSON.parse(saved);
      const now = new Date();
      
      switch (preset) {
        case 'today':
          return { from: startOfDay(now), to: endOfDay(now), preset };
        case 'this-week':
          return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }), preset };
        case 'this-month':
          return { from: startOfMonth(now), to: endOfMonth(now), preset };
        case 'this-quarter':
          return { from: startOfQuarter(now), to: endOfQuarter(now), preset };
        case 'this-year':
          return { from: startOfYear(now), to: endOfYear(now), preset };
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // Default to this month
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
    preset: 'this-month'
  };
}


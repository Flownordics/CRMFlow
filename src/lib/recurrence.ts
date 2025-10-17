/**
 * Recurrence utilities for calendar events
 * Supports basic RRULE parsing and event generation
 */

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Date;
  byweekday?: number[]; // 0=Sunday, 1=Monday, etc.
}

/**
 * Parse RRULE string to RecurrenceRule object
 * Example: "FREQ=DAILY;INTERVAL=1;COUNT=10"
 */
export function parseRRule(rrule: string): RecurrenceRule | null {
  try {
    const parts = rrule.split(';');
    const rule: Partial<RecurrenceRule> = {};
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      
      switch (key) {
        case 'FREQ':
          rule.freq = value as RecurrenceRule['freq'];
          break;
        case 'INTERVAL':
          rule.interval = parseInt(value);
          break;
        case 'COUNT':
          rule.count = parseInt(value);
          break;
        case 'UNTIL':
          rule.until = new Date(value);
          break;
        case 'BYDAY':
          // MO,TU,WE,TH,FR -> [1,2,3,4,5]
          const dayMap: Record<string, number> = {
            SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
          };
          rule.byweekday = value.split(',').map(d => dayMap[d]).filter(d => d !== undefined);
          break;
      }
    });
    
    if (!rule.freq || rule.interval === undefined) {
      return null;
    }
    
    return rule as RecurrenceRule;
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return null;
  }
}

/**
 * Generate RRULE string from RecurrenceRule object
 */
export function generateRRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq}`, `INTERVAL=${rule.interval}`];
  
  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }
  
  if (rule.until) {
    parts.push(`UNTIL=${rule.until.toISOString()}`);
  }
  
  if (rule.byweekday && rule.byweekday.length > 0) {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const days = rule.byweekday.map(d => dayMap[d]).join(',');
    parts.push(`BYDAY=${days}`);
  }
  
  return parts.join(';');
}

/**
 * Generate recurring event instances
 * Returns array of start dates for recurring events
 */
export function generateRecurringDates(
  startDate: Date,
  rule: RecurrenceRule,
  exceptionDates: string[] = []
): Date[] {
  const dates: Date[] = [];
  const exceptions = new Set(exceptionDates);
  let currentDate = new Date(startDate);
  
  const maxIterations = rule.count || 100; // Safety limit
  const endDate = rule.until || new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year max
  
  for (let i = 0; i < maxIterations && currentDate <= endDate; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    if (!exceptions.has(dateStr)) {
      // Check weekday filter for weekly recurrence
      if (rule.byweekday && rule.byweekday.length > 0) {
        if (rule.byweekday.includes(currentDate.getDay())) {
          dates.push(new Date(currentDate));
        }
      } else {
        dates.push(new Date(currentDate));
      }
    }
    
    // Advance to next date based on frequency
    switch (rule.freq) {
      case 'DAILY':
        currentDate.setDate(currentDate.getDate() + rule.interval);
        break;
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + (7 * rule.interval));
        break;
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + rule.interval);
        break;
      case 'YEARLY':
        currentDate.setFullYear(currentDate.getFullYear() + rule.interval);
        break;
    }
  }
  
  return dates;
}

/**
 * Get human-readable description of recurrence rule
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  const freq = rule.freq.toLowerCase();
  const interval = rule.interval;
  
  // Convert "daily" -> "day", "weekly" -> "week", "monthly" -> "month", "yearly" -> "year"
  const freqMap: Record<string, string> = {
    'daily': 'day',
    'weekly': 'week',
    'monthly': 'month',
    'yearly': 'year',
  };
  
  const freqSingular = freqMap[freq] || freq;
  
  let description = interval === 1 
    ? `Every ${freqSingular}` 
    : `Every ${interval} ${freq}`;
  
  if (rule.byweekday && rule.byweekday.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = rule.byweekday.map(d => dayNames[d]).join(', ');
    description += ` on ${days}`;
  }
  
  if (rule.count) {
    description += `, ${rule.count} times`;
  } else if (rule.until) {
    description += ` until ${rule.until.toLocaleDateString()}`;
  }
  
  return description;
}


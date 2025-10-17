import { describe, it, expect } from 'vitest';
import {
  parseRRule,
  generateRRule,
  generateRecurringDates,
  describeRecurrence,
} from '../recurrence';

describe('Recurrence Utilities', () => {
  describe('parseRRule', () => {
    it('should parse daily recurrence', () => {
      const rule = parseRRule('FREQ=DAILY;INTERVAL=1;COUNT=10');
      
      expect(rule).toEqual({
        freq: 'DAILY',
        interval: 1,
        count: 10,
      });
    });

    it('should parse weekly recurrence with specific days', () => {
      const rule = parseRRule('FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
      
      expect(rule?.freq).toBe('WEEKLY');
      expect(rule?.interval).toBe(1);
      expect(rule?.byweekday).toEqual([1, 3, 5]); // Monday, Wednesday, Friday
    });

    it('should parse monthly recurrence', () => {
      const rule = parseRRule('FREQ=MONTHLY;INTERVAL=2;COUNT=6');
      
      expect(rule).toEqual({
        freq: 'MONTHLY',
        interval: 2,
        count: 6,
      });
    });

    it('should return null for invalid RRULE', () => {
      const rule = parseRRule('INVALID');
      expect(rule).toBeNull();
    });
  });

  describe('generateRRule', () => {
    it('should generate RRULE string from rule object', () => {
      const rule = {
        freq: 'DAILY' as const,
        interval: 2,
        count: 5,
      };

      const rrule = generateRRule(rule);
      expect(rrule).toBe('FREQ=DAILY;INTERVAL=2;COUNT=5');
    });

    it('should include BYDAY for weekly rules', () => {
      const rule = {
        freq: 'WEEKLY' as const,
        interval: 1,
        byweekday: [1, 3, 5], // Mon, Wed, Fri
      };

      const rrule = generateRRule(rule);
      expect(rrule).toBe('FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
    });

    it('should include UNTIL for rules with end date', () => {
      const endDate = new Date('2025-12-31');
      const rule = {
        freq: 'DAILY' as const,
        interval: 1,
        until: endDate,
      };

      const rrule = generateRRule(rule);
      expect(rrule).toContain('FREQ=DAILY;INTERVAL=1;UNTIL=');
      expect(rrule).toContain('2025-12-31');
    });
  });

  describe('generateRecurringDates', () => {
    it('should generate daily recurring dates', () => {
      const startDate = new Date('2025-10-20');
      const rule = {
        freq: 'DAILY' as const,
        interval: 1,
        count: 5,
      };

      const dates = generateRecurringDates(startDate, rule);

      expect(dates).toHaveLength(5);
      expect(dates[0].toISOString().split('T')[0]).toBe('2025-10-20');
      expect(dates[1].toISOString().split('T')[0]).toBe('2025-10-21');
      expect(dates[4].toISOString().split('T')[0]).toBe('2025-10-24');
    });

    it('should generate weekly recurring dates', () => {
      const startDate = new Date('2025-10-20'); // Monday
      const rule = {
        freq: 'WEEKLY' as const,
        interval: 1,
        count: 3,
      };

      const dates = generateRecurringDates(startDate, rule);

      expect(dates).toHaveLength(3);
      // Check dates are one week apart (allowing for DST)
      const daysDiff = (dates[1].getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
      expect(daysDiff).toBeGreaterThanOrEqual(6.9); // Account for DST
      expect(daysDiff).toBeLessThanOrEqual(7.1);
    });

    it('should filter by weekday for weekly rules', () => {
      const startDate = new Date('2025-10-20'); // Monday
      const rule = {
        freq: 'WEEKLY' as const,
        interval: 1,
        byweekday: [1, 3, 5], // Mon, Wed, Fri
        count: 10,
      };

      const dates = generateRecurringDates(startDate, rule);

      // Should only include Mon, Wed, Fri
      dates.forEach(date => {
        const day = date.getDay();
        expect([1, 3, 5]).toContain(day);
      });
    });

    it('should exclude exception dates', () => {
      const startDate = new Date('2025-10-20');
      const rule = {
        freq: 'DAILY' as const,
        interval: 1,
        count: 5,
      };
      const exceptionDates = ['2025-10-22']; // Skip Oct 22

      const dates = generateRecurringDates(startDate, rule, exceptionDates);

      const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
      expect(dateStrings).not.toContain('2025-10-22');
    });
  });

  describe('describeRecurrence', () => {
    it('should describe daily recurrence', () => {
      const description = describeRecurrence({
        freq: 'DAILY',
        interval: 1,
        count: 10,
      });

      expect(description).toContain('Every day');
      expect(description).toContain('10 times');
    });

    it('should describe weekly recurrence with days', () => {
      const description = describeRecurrence({
        freq: 'WEEKLY',
        interval: 1,
        byweekday: [1, 3, 5],
        count: 10,
      });

      expect(description).toContain('Every week');
      expect(description).toContain('Monday');
      expect(description).toContain('Wednesday');
      expect(description).toContain('Friday');
    });

    it('should describe every 2 weeks', () => {
      const description = describeRecurrence({
        freq: 'WEEKLY',
        interval: 2,
      });

      expect(description).toContain('Every 2 weekly');
    });

    it('should include end date when specified', () => {
      const endDate = new Date('2025-12-31');
      const description = describeRecurrence({
        freq: 'DAILY',
        interval: 1,
        until: endDate,
      });

      expect(description).toContain('until');
      // Accept either US or European date format
      expect(description).toMatch(/31[\.\/-]12[\.\/-]2025|12[\.\/-]31[\.\/-]2025/);
    });
  });
});


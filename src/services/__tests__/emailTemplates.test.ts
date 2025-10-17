import { describe, it, expect } from 'vitest';
import { replaceVariables, parseRRule, generateRRule, describeRecurrence } from '../emailTemplates';
import { parseRRule as parseRecurrenceRule, generateRRule as generateRecurrenceRule, describeRecurrence as describeRec } from '@/lib/recurrence';

describe('Email Templates', () => {
  describe('replaceVariables', () => {
    it('should replace simple variables', () => {
      const template = 'Hello {{customer_name}}, your quote {{quote_number}} is ready';
      const variables = {
        customer_name: 'John Doe',
        quote_number: 'Q-2025-001',
      };
      
      const result = replaceVariables(template, variables);
      expect(result).toBe('Hello John Doe, your quote Q-2025-001 is ready');
    });
    
    it('should handle conditional blocks', () => {
      const template = '{{#if custom_message}}Custom: {{custom_message}}{{/if}}';
      
      const withMessage = replaceVariables(template, { custom_message: 'Important note' });
      expect(withMessage).toBe('Custom: Important note');
      
      const withoutMessage = replaceVariables(template, { custom_message: '' });
      expect(withoutMessage).toBe('');
    });
    
    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{customer_name}}';
      const result = replaceVariables(template, {});
      expect(result).toBe('Hello ');
    });
  });
});

describe('Recurrence', () => {
  describe('parseRRule', () => {
    it('should parse daily recurrence', () => {
      const rule = parseRecurrenceRule('FREQ=DAILY;INTERVAL=1;COUNT=10');
      expect(rule).toEqual({
        freq: 'DAILY',
        interval: 1,
        count: 10,
      });
    });
    
    it('should parse weekly recurrence with days', () => {
      const rule = parseRecurrenceRule('FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
      expect(rule?.freq).toBe('WEEKLY');
      expect(rule?.byweekday).toEqual([1, 3, 5]); // Monday, Wednesday, Friday
    });
  });
  
  describe('generateRRule', () => {
    it('should generate RRULE string', () => {
      const rule = {
        freq: 'DAILY' as const,
        interval: 2,
        count: 5,
      };
      
      const rrule = generateRecurrenceRule(rule);
      expect(rrule).toBe('FREQ=DAILY;INTERVAL=2;COUNT=5');
    });
  });
  
  describe('describeRecurrence', () => {
    it('should describe daily recurrence', () => {
      const description = describeRec({
        freq: 'DAILY',
        interval: 1,
        count: 10,
      });
      
      expect(description).toContain('Every day');
      expect(description).toContain('10 times');
    });
    
    it('should describe weekly recurrence', () => {
      const description = describeRec({
        freq: 'WEEKLY',
        interval: 2,
        byweekday: [1, 3, 5],
      });
      
      expect(description).toContain('Every 2 weekly');
      expect(description).toContain('Monday');
    });
  });
});


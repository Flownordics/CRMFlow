import { describe, it, expect } from 'vitest';
import {
    mergeEvents,
    filterEventsByKind,
    getEventsForToday,
    getEventsForThisWeek,
    nativeEventToMerged,
    googleEventToMerged
} from './calendar-utils';
import { EventRow } from '@/services/events';
import { GoogleCalendarEvent } from '@/services/calendar';

describe('Calendar Utils', () => {
    const mockNativeEvent: EventRow = {
        id: 'native-1',
        title: 'Native Meeting',
        description: 'Native meeting description',
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T11:00:00Z',
        all_day: false,
        location: 'Office',
        attendees: [{ email: 'user@example.com', name: 'User', optional: false }],
        color: 'primary',
        kind: 'meeting',
        deal_id: 'deal-1',
        company_id: 'company-1',
        quote_id: null,
        order_id: null,
        google_event_id: null,
        sync_state: 'none',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    const mockGoogleEvent: GoogleCalendarEvent = {
        id: 'google-1',
        summary: 'Google Call',
        description: 'Google call description',
        location: 'Zoom',
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T15:00:00Z' },
        attendees: [{ email: 'client@example.com', displayName: 'Client', responseStatus: 'accepted' }],
        extendedProperties: {
            private: {
                crmflowKind: 'call',
                crmflowDealId: 'deal-2'
            }
        }
    };

    describe('nativeEventToMerged', () => {
        it('should convert native event to merged format', () => {
            const result = nativeEventToMerged(mockNativeEvent);

            expect(result).toEqual({
                id: 'native-1',
                title: 'Native Meeting',
                description: 'Native meeting description',
                start_at: '2024-01-15T10:00:00Z',
                end_at: '2024-01-15T11:00:00Z',
                all_day: false,
                location: 'Office',
                attendees: [{ email: 'user@example.com', name: 'User', optional: false }],
                color: 'primary',
                kind: 'meeting',
                source: 'native',
                deal_id: 'deal-1',
                company_id: 'company-1',
                quote_id: undefined,
                order_id: undefined,
                nativeEvent: mockNativeEvent
            });
        });
    });

    describe('googleEventToMerged', () => {
        it('should convert Google event to merged format', () => {
            const result = googleEventToMerged(mockGoogleEvent);

            expect(result).toEqual({
                id: 'google-1',
                title: 'Google Call',
                description: 'Google call description',
                start_at: '2024-01-15T14:00:00Z',
                end_at: '2024-01-15T15:00:00Z',
                all_day: false,
                location: 'Zoom',
                attendees: [{ email: 'client@example.com', name: 'Client', optional: false }],
                color: 'accent',
                kind: 'call',
                source: 'google',
                deal_id: undefined,
                company_id: undefined,
                quote_id: undefined,
                order_id: undefined,
                googleEvent: mockGoogleEvent
            });
        });

        it('should handle all-day Google events', () => {
            const allDayEvent: GoogleCalendarEvent = {
                ...mockGoogleEvent,
                start: { date: '2024-01-15' },
                end: { date: '2024-01-15' }
            };

            const result = googleEventToMerged(allDayEvent);

            expect(result.all_day).toBe(true);
            expect(result.start_at).toBe('2024-01-15');
            expect(result.end_at).toBe('2024-01-15');
        });

        it('should generate ID for Google events without ID', () => {
            const eventWithoutId: GoogleCalendarEvent = {
                ...mockGoogleEvent,
                id: undefined
            };

            const result = googleEventToMerged(eventWithoutId);

            expect(result.id).toMatch(/^google-\d+-\d+$/);
        });
    });

    describe('mergeEvents', () => {
        it('should merge native and Google events and sort by start time', () => {
            const nativeEvents = [mockNativeEvent];
            const googleEvents = [mockGoogleEvent];

            const result = mergeEvents(nativeEvents, googleEvents);

            expect(result).toHaveLength(2);
            expect(result[0].source).toBe('native'); // 10:00
            expect(result[1].source).toBe('google');  // 14:00
        });

        it('should handle empty arrays', () => {
            const result = mergeEvents([], []);
            expect(result).toEqual([]);
        });

        it('should handle only native events', () => {
            const result = mergeEvents([mockNativeEvent], []);
            expect(result).toHaveLength(1);
            expect(result[0].source).toBe('native');
        });

        it('should handle only Google events', () => {
            const result = mergeEvents([], [mockGoogleEvent]);
            expect(result).toHaveLength(1);
            expect(result[0].source).toBe('google');
        });
    });

    describe('filterEventsByKind', () => {
        const events = [
            { ...nativeEventToMerged(mockNativeEvent), kind: 'meeting' },
            { ...googleEventToMerged(mockGoogleEvent), kind: 'call' },
            { ...nativeEventToMerged(mockNativeEvent), id: 'event-3', kind: 'deadline' }
        ];

        it('should filter events by kind', () => {
            const result = filterEventsByKind(events, ['meeting', 'call']);
            expect(result).toHaveLength(2);
            expect(result.every(e => ['meeting', 'call'].includes(e.kind!))).toBe(true);
        });

        it('should return all events when no kinds specified', () => {
            const result = filterEventsByKind(events, []);
            expect(result).toEqual(events);
        });

        it('should return empty array when no events match', () => {
            const result = filterEventsByKind(events, ['other']);
            expect(result).toEqual([]);
        });

        it('should handle events without kind', () => {
            const eventsWithoutKind = [
                { ...nativeEventToMerged(mockNativeEvent), kind: undefined },
                { ...googleEventToMerged(mockGoogleEvent), kind: 'meeting' }
            ];

            const result = filterEventsByKind(eventsWithoutKind, ['meeting']);
            expect(result).toHaveLength(1);
            expect(result[0].kind).toBe('meeting');
        });
    });

    describe('getEventsForToday', () => {
        const today = new Date('2024-01-15T12:00:00Z');
        const events = [
            { ...nativeEventToMerged(mockNativeEvent), start_at: '2024-01-15T10:00:00Z' },
            { ...googleEventToMerged(mockGoogleEvent), start_at: '2024-01-14T14:00:00Z' },
            { ...nativeEventToMerged(mockNativeEvent), id: 'event-3', start_at: '2024-01-16T09:00:00Z' }
        ];

        it('should return events for today', () => {
            const result = getEventsForToday(events);
            expect(result).toHaveLength(1);
            expect(result[0].start_at).toBe('2024-01-15T10:00:00Z');
        });

        it('should handle empty events array', () => {
            const result = getEventsForToday([]);
            expect(result).toEqual([]);
        });
    });

    describe('getEventsForThisWeek', () => {
        const today = new Date('2024-01-15T12:00:00Z'); // Monday
        const events = [
            { ...nativeEventToMerged(mockNativeEvent), start_at: '2024-01-15T10:00:00Z' }, // Monday
            { ...googleEventToMerged(mockGoogleEvent), start_at: '2024-01-16T14:00:00Z' }, // Tuesday
            { ...nativeEventToMerged(mockNativeEvent), id: 'event-3', start_at: '2024-01-22T09:00:00Z' }, // Next Monday
            { ...googleEventToMerged(mockGoogleEvent), id: 'event-4', start_at: '2024-01-14T09:00:00Z' } // Sunday (previous week)
        ];

        it('should return events for this week', () => {
            const result = getEventsForThisWeek(events);
            expect(result).toHaveLength(2);
            expect(result.every(e =>
                new Date(e.start_at) >= new Date('2024-01-14T00:00:00Z') &&
                new Date(e.start_at) <= new Date('2024-01-20T23:59:59Z')
            )).toBe(true);
        });

        it('should handle empty events array', () => {
            const result = getEventsForThisWeek([]);
            expect(result).toEqual([]);
        });
    });
});

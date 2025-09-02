import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventRowSchema, CreateEventPayloadSchema, listEvents, createEvent, updateEvent, deleteEvent } from './events';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn(() => ({
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            eq: vi.fn(),
            gte: vi.fn(),
            lte: vi.fn(),
            in: vi.fn(),
            order: vi.fn(),
            single: vi.fn()
        }))
    }
}));

const mockSupabase = vi.mocked(supabase);

describe('Events Service', () => {
    const mockUser = { id: 'test-user-id' };
    const mockEvent: any = {
        id: 'test-event-id',
        title: 'Test Event',
        description: 'Test Description',
        start_at: '2024-01-01T10:00:00Z',
        end_at: '2024-01-01T11:00:00Z',
        all_day: false,
        location: 'Test Location',
        attendees: [{ email: 'test@example.com', name: 'Test User', optional: false }],
        color: 'primary',
        kind: 'meeting',
        deal_id: null,
        company_id: null,
        quote_id: null,
        order_id: null,
        google_event_id: null,
        sync_state: 'none',
        created_by: 'test-user-id',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('EventRowSchema', () => {
        it('should validate a valid event', () => {
            const result = EventRowSchema.safeParse(mockEvent);
            expect(result.success).toBe(true);
        });

        it('should reject invalid event with missing required fields', () => {
            const invalidEvent = { ...mockEvent, title: undefined };
            const result = EventRowSchema.safeParse(invalidEvent);
            expect(result.success).toBe(false);
        });

        it('should reject invalid event with invalid UUID', () => {
            const invalidEvent = { ...mockEvent, id: 'invalid-uuid' };
            const result = EventRowSchema.safeParse(invalidEvent);
            expect(result.success).toBe(false);
        });
    });

    describe('CreateEventPayloadSchema', () => {
        it('should validate a valid create payload', () => {
            const payload = {
                title: 'Test Event',
                description: 'Test Description',
                start_at: '2024-01-01T10:00:00Z',
                end_at: '2024-01-01T11:00:00Z',
                all_day: false,
                location: 'Test Location',
                attendees: [{ email: 'test@example.com', name: 'Test User', optional: false }],
                color: 'primary' as const,
                kind: 'meeting' as const,
                deal_id: 'test-deal-id',
                company_id: 'test-company-id'
            };

            const result = CreateEventPayloadSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });

        it('should reject payload without required title', () => {
            const payload = {
                description: 'Test Description',
                start_at: '2024-01-01T10:00:00Z',
                end_at: '2024-01-01T11:00:00Z'
            };

            const result = CreateEventPayloadSchema.safeParse(payload);
            expect(result.success).toBe(false);
        });
    });

    describe('listEvents', () => {
        it('should list events with basic parameters', async () => {
            const mockQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [mockEvent], error: null })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            const result = await listEvents({
                from: '2024-01-01T00:00:00Z',
                to: '2024-01-31T23:59:59Z'
            });

            expect(result).toEqual([mockEvent]);
            expect(mockSupabase.from).toHaveBeenCalledWith('events');
            expect(mockQuery.eq).toHaveBeenCalledWith('created_by', mockUser.id);
            expect(mockQuery.gte).toHaveBeenCalledWith('start_at', '2024-01-01T00:00:00Z');
            expect(mockQuery.lte).toHaveBeenCalledWith('end_at', '2024-01-31T23:59:59Z');
        });

        it('should apply kind filters', async () => {
            const mockQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [mockEvent], error: null })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            await listEvents({
                from: '2024-01-01T00:00:00Z',
                to: '2024-01-31T23:59:59Z',
                kinds: ['meeting', 'call']
            });

            expect(mockQuery.in).toHaveBeenCalledWith('kind', ['meeting', 'call']);
        });

        it('should apply deal filter', async () => {
            const mockQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [mockEvent], error: null })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            await listEvents({
                from: '2024-01-01T00:00:00Z',
                to: '2024-01-31T23:59:59Z',
                dealId: 'test-deal-id'
            });

            expect(mockQuery.eq).toHaveBeenCalledWith('deal_id', 'test-deal-id');
        });

        it('should throw error when user not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

            await expect(listEvents({
                from: '2024-01-01T00:00:00Z',
                to: '2024-01-31T23:59:59Z'
            })).rejects.toThrow('User not authenticated');
        });
    });

    describe('createEvent', () => {
        it('should create an event successfully', async () => {
            const mockQuery = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            const payload = {
                title: 'Test Event',
                start_at: '2024-01-01T10:00:00Z',
                end_at: '2024-01-01T11:00:00Z'
            };

            const result = await createEvent(payload);

            expect(result).toEqual(mockEvent);
            expect(mockQuery.insert).toHaveBeenCalledWith({
                ...payload,
                created_by: mockUser.id
            });
        });

        it('should throw error when user not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

            await expect(createEvent({
                title: 'Test Event',
                start_at: '2024-01-01T10:00:00Z',
                end_at: '2024-01-01T11:00:00Z'
            })).rejects.toThrow('User not authenticated');
        });
    });

    describe('updateEvent', () => {
        it('should update an event successfully', async () => {
            const mockQuery = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            const payload = {
                title: 'Updated Event Title'
            };

            const result = await updateEvent('test-event-id', payload);

            expect(result).toEqual(mockEvent);
            expect(mockQuery.update).toHaveBeenCalledWith(payload);
            expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-event-id');
            expect(mockQuery.eq).toHaveBeenCalledWith('created_by', mockUser.id);
        });
    });

    describe('deleteEvent', () => {
        it('should delete an event successfully', async () => {
            const mockQuery = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            await deleteEvent('test-event-id');

            expect(mockQuery.delete).toHaveBeenCalled();
            expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-event-id');
            expect(mockQuery.eq).toHaveBeenCalledWith('created_by', mockUser.id);
        });

        it('should throw error when deletion fails', async () => {
            const mockQuery = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
            };

            mockSupabase.from.mockReturnValue(mockQuery as any);

            await expect(deleteEvent('test-event-id')).rejects.toThrow('Failed to delete event: Delete failed');
        });
    });
});

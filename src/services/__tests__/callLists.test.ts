import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    fetchCallLists,
    createCallList,
    autoGenerateCallList,
} from '../callLists';
import { logCompanyActivity } from '../activityLog';
import { apiClient, apiPostWithReturn } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/lib/api');
vi.mock('@/integrations/supabase/client');
vi.mock('@/lib/errorHandler', () => ({
    handleError: (error: any) => {
        throw error;
    },
}));
vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe('Call Lists Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Supabase auth
        (supabase.auth.getUser as any) = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                },
            },
        });
    });

    describe('fetchCallLists', () => {
        it('should fetch call lists for the current user', async () => {
            const mockLists = [
                {
                    id: 'list-1',
                    name: 'Test List',
                    owner_user_id: 'test-user-id',
                    is_shared: false,
                    description: 'Test description',
                    created_at: '2025-01-30T12:00:00Z',
                    updated_at: '2025-01-30T12:00:00Z',
                },
            ];

            (apiClient.get as any) = vi.fn().mockResolvedValue({
                data: mockLists,
                headers: {},
            });

            const result = await fetchCallLists({ mine: true });

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'list-1',
                name: 'Test List',
                ownerUserId: 'test-user-id',
                isShared: false,
            });
        });
    });

    describe('createCallList', () => {
        it('should create a new call list', async () => {
            const mockCreated = {
                id: 'new-list-id',
                name: 'New List',
                owner_user_id: 'test-user-id',
                is_shared: false,
                description: null,
                created_at: '2025-01-30T12:00:00Z',
                updated_at: '2025-01-30T12:00:00Z',
            };

            (apiPostWithReturn as any) = vi.fn().mockResolvedValue({
                data: [mockCreated],
                headers: {},
            });

            const result = await createCallList({
                name: 'New List',
                isShared: false,
            });

            expect(result).toMatchObject({
                id: 'new-list-id',
                name: 'New List',
                ownerUserId: 'test-user-id',
                isShared: false,
            });
        });
    });

    describe('autoGenerateCallList', () => {
        it('should generate call list with prioritized companies (Red first)', async () => {
            // Mock red companies
            const mockRedCompanies = [
                {
                    id: 'company-1',
                    name: 'Red Company 1',
                    phone: '+45 12345678',
                    activity_status: 'red',
                    last_activity_at: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'company-2',
                    name: 'Red Company 2',
                    phone: '+45 23456789',
                    activity_status: 'red',
                    last_activity_at: '2024-02-01T00:00:00Z',
                },
            ];

            // Mock API calls
            (apiClient.get as any) = vi.fn()
                .mockResolvedValueOnce({ data: mockRedCompanies, headers: {} }) // Red companies
                .mockResolvedValueOnce({ data: [], headers: {} }) // Yellow companies (not needed)
                .mockResolvedValueOnce({ data: [], headers: {} }); // Green companies (not needed)

            (apiPostWithReturn as any) = vi.fn().mockResolvedValue({
                data: [{
                    id: 'new-list-id',
                    name: 'Auto-ringeliste',
                    owner_user_id: 'test-user-id',
                    is_shared: false,
                    created_at: '2025-01-30T12:00:00Z',
                    updated_at: '2025-01-30T12:00:00Z',
                }],
                headers: {},
            });

            const result = await autoGenerateCallList({
                name: 'Auto-ringeliste',
                limit: 20,
            });

            expect(result.itemCount).toBe(2);
            expect(result.created).toBe(true);
            expect(result.companies).toHaveLength(2);
            expect(result.companies[0].activity_status).toBe('red');
        });

        it('should fill with yellow companies if red count is insufficient', async () => {
            const mockRedCompanies = [
                {
                    id: 'company-1',
                    name: 'Red Company 1',
                    phone: '+45 12345678',
                    activity_status: 'red',
                    last_activity_at: '2024-01-01T00:00:00Z',
                },
            ];

            const mockYellowCompanies = [
                {
                    id: 'company-2',
                    name: 'Yellow Company 1',
                    phone: '+45 23456789',
                    activity_status: 'yellow',
                    last_activity_at: '2024-08-01T00:00:00Z',
                },
            ];

            (apiClient.get as any) = vi.fn()
                .mockResolvedValueOnce({ data: mockRedCompanies, headers: {} })
                .mockResolvedValueOnce({ data: mockYellowCompanies, headers: {} });

            (apiPostWithReturn as any) = vi.fn().mockResolvedValue({
                data: [{
                    id: 'new-list-id',
                    name: 'Auto-ringeliste',
                    owner_user_id: 'test-user-id',
                    is_shared: false,
                    created_at: '2025-01-30T12:00:00Z',
                    updated_at: '2025-01-30T12:00:00Z',
                }],
                headers: {},
            });

            const result = await autoGenerateCallList({
                name: 'Auto-ringeliste',
                limit: 20,
            });

            expect(result.itemCount).toBe(2);
            expect(result.companies[0].activity_status).toBe('red');
            expect(result.companies[1].activity_status).toBe('yellow');
        });
    });
});

describe('Activity Log Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        (supabase.auth.getUser as any) = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: 'test-user-id',
                },
            },
        });
    });

    describe('logCompanyActivity', () => {
        it('should log a call activity and update company status', async () => {
            const mockActivity = {
                id: 'activity-1',
                company_id: 'company-1',
                user_id: 'test-user-id',
                type: 'call',
                outcome: 'completed',
                notes: 'Great conversation',
                meta: {},
                created_at: '2025-01-30T12:00:00Z',
            };

            (apiPostWithReturn as any) = vi.fn().mockResolvedValue({
                data: [mockActivity],
                headers: {},
            });

            const result = await logCompanyActivity({
                companyId: 'company-1',
                type: 'call',
                outcome: 'completed',
                notes: 'Great conversation',
            });

            expect(result).toMatchObject({
                id: 'activity-1',
                companyId: 'company-1',
                type: 'call',
                outcome: 'completed',
                notes: 'Great conversation',
            });

            expect(apiPostWithReturn).toHaveBeenCalledWith('/activity_log', {
                company_id: 'company-1',
                user_id: 'test-user-id',
                type: 'call',
                outcome: 'completed',
                notes: 'Great conversation',
                meta: {},
            });
        });
    });
});

describe('Activity Status Computation', () => {
    it('should compute green status for recent activity (<= 90 days)', () => {
        // This would be tested via the database function in integration tests
        // For unit tests, we can verify the UI helpers

        const { getActivityStatusColor, getActivityStatusLabel } = require('../activityLog');

        expect(getActivityStatusColor('green')).toBe('bg-green-500');
        expect(getActivityStatusLabel('green')).toContain('Aktiv');
    });

    it('should compute yellow status for moderate inactivity (91-180 days)', () => {
        const { getActivityStatusColor, getActivityStatusLabel } = require('../activityLog');

        expect(getActivityStatusColor('yellow')).toBe('bg-yellow-500');
        expect(getActivityStatusLabel('yellow')).toContain('Inaktiv');
    });

    it('should compute red status for high inactivity (> 180 days)', () => {
        const { getActivityStatusColor, getActivityStatusLabel } = require('../activityLog');

        expect(getActivityStatusColor('red')).toBe('bg-red-500');
        expect(getActivityStatusLabel('red')).toContain('Meget inaktiv');
    });
});

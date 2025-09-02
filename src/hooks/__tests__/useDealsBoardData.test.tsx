import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDealsBoardData } from '../useDealsBoardData';
import { Deal } from '@/services/deals';
import { describe, it, expect } from 'vitest';

// Mock the services to return static data
vi.mock('@/services/deals', () => ({
  useDeals: vi.fn(() => ({
    data: {
      data: [
        {
          id: '1',
          title: 'Deal 1',
          company_id: 'company-1',
          stage_id: 'stage-1',
          position: 0,
          currency: 'DKK',
          expected_value_minor: 100000, // 1000 DKK
          close_date: '2024-01-15',
          probability: 0.8, // 80%
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Deal 2',
          company_id: 'company-2',
          stage_id: 'stage-2',
          position: 0,
          currency: 'DKK',
          expected_value_minor: 200000, // 2000 DKK
          close_date: '2024-01-20',
          probability: null, // Will use stage default
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '3',
          title: 'Deal 3',
          company_id: 'company-3',
          stage_id: 'stage-1',
          position: 1,
          currency: 'DKK',
          expected_value_minor: 50000, // 500 DKK
          close_date: '2024-01-25',
          probability: 0.6, // 60%
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/services/pipelines', () => ({
  usePipelines: vi.fn(() => ({
    data: [
      {
        id: 'pipeline-1',
        name: 'Default Pipeline',
        stages: [
          { id: 'stage-1', name: 'Stage 1' },
          { id: 'stage-2', name: 'Stage 2' },
        ],
      },
    ],
    isLoading: false,
  })),
  useStageProbabilities: vi.fn(() => ({
    data: {
      'stage-1': 70, // 70%
      'stage-2': 50, // 50%
    },
    isLoading: false,
  })),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useDealsBoardData', () => {
  it('should calculate weighted pipeline correctly', () => {
    const { result } = renderHook(() => useDealsBoardData(), {
      wrapper: createWrapper(),
    });

    // Expected weighted pipeline calculation:
    // Deal 1: 100000 * 0.8 = 80000
    // Deal 2: 200000 * 0.5 = 100000 (uses stage default 50%)
    // Deal 3: 50000 * 0.6 = 30000
    // Total: 80000 + 100000 + 30000 = 210000
    expect(result.current.weightedMinor).toBe(210000);
  });

  it('should calculate stage totals correctly', () => {
    const { result } = renderHook(() => useDealsBoardData(), {
      wrapper: createWrapper(),
    });

    // Stage 1: Deal 1 (100000) + Deal 3 (50000) = 150000
    // Stage 2: Deal 2 (200000) = 200000
    expect(result.current.stageTotalsMinor).toEqual({
      'stage-1': 150000,
      'stage-2': 200000,
    });
  });

  it('should calculate counts correctly', () => {
    const now = new Date('2024-01-10'); // Middle of January
    
    const { result } = renderHook(() => useDealsBoardData({ now }), {
      wrapper: createWrapper(),
    });

    expect(result.current.counts).toEqual({
      perStage: {
        'stage-1': 2, // Deal 1 and Deal 3
        'stage-2': 1, // Deal 2
      },
      total: 3,
      dueSoon: 1, // Deal 1 (2024-01-15) is within 7 days of 2024-01-10
      thisMonthExpected: 3, // All deals are in January
    });
  });

  it('should return correct data structure', () => {
    const { result } = renderHook(() => useDealsBoardData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.deals).toHaveLength(3);
    expect(result.current.stages).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});

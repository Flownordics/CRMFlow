# Hooks

## useDealsBoardData

A centralized hook that provides all the data needed for both the Kanban board and KPI dashboard, ensuring they use the same dataset and filters.

### Features

- **Centralized Data Source**: Both Kanban board and KPI dashboard use the same data
- **Consistent Filtering**: Same filters applied to both views
- **Weighted Pipeline Calculation**: Accurate probability-based pipeline value
- **Stage Totals**: Sum of deal values per stage
- **Counts**: Various deal counts (total, per stage, due soon, etc.)
- **Currency Consistency**: Ensures all monetary values use the same currency

### Usage

```tsx
import { useDealsBoardData } from '@/hooks/useDealsBoardData';

function DealsBoard() {
  const {
    deals,
    stages,
    stageTotalsMinor,
    weightedMinor,
    counts,
    isLoading,
    error
  } = useDealsBoardData({
    // Optional filters
    q: 'search term',
    stage_id: 'specific-stage-id',
    company_id: 'specific-company-id',
    page: 1,
    limit: 20,
    now: new Date() // For date-based calculations
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {/* KPI Header */}
      <DealsKpiHeader params={{ q: 'search term' }} />
      
      {/* Kanban Board */}
      <KanbanBoard deals={deals} stages={stages} />
    </div>
  );
}
```

### Return Value

```typescript
interface DealsBoardData {
  // Core data
  deals: Deal[];
  stages: Array<{ id: string; name: string }>;
  
  // Stage totals (sum per stage)
  stageTotalsMinor: Record<string, number>;
  
  // Weighted pipeline calculation
  weightedMinor: number;
  
  // Counts
  counts: {
    perStage: Record<string, number>;
    total: number;
    dueSoon: number;
    thisMonthExpected: number;
  };
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
}
```

### Parameters

```typescript
interface UseDealsBoardDataParams {
  page?: number;
  limit?: number;
  q?: string;           // Search term
  stage_id?: string;    // Filter by stage
  company_id?: string;  // Filter by company
  now?: Date;          // For date calculations (defaults to current date)
}
```

### Benefits

1. **Single Source of Truth**: All deal data comes from one place
2. **Consistent Calculations**: KPI and board show exactly the same numbers
3. **Performance**: Shared data fetching and caching
4. **Maintainability**: Changes to data logic only need to be made in one place
5. **Type Safety**: Full TypeScript support with proper interfaces

### Testing

The hook includes comprehensive unit tests that verify:
- Weighted pipeline calculations
- Stage totals
- Deal counts
- Date-based filtering
- Error handling

Run tests with: `npm test useDealsBoardData`

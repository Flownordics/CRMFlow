# Stage Probabilities Implementation

## Overview

The Stage Probabilities feature in CRMFlow Settings allows users to configure win probability percentages for each pipeline stage. These probabilities are used for weighted pipeline calculations and forecasting.

## What Was Implemented

### 1. Database Schema
- **`pipelines`** table: Stores pipeline definitions
- **`stages`** table: Stores individual stages within pipelines
- **`stage_probabilities`** table: Stores win probability for each stage (0.0 to 1.0)

### 2. Default Sales Pipeline
The migration creates a complete default sales pipeline with realistic probabilities:

| Stage | Position | Default Probability | Win Rate |
|-------|----------|---------------------|----------|
| Lead | 1 | 0.05 | 5% |
| Qualified | 2 | 0.15 | 15% |
| Proposal | 3 | 0.30 | 30% |
| Negotiation | 4 | 0.60 | 60% |
| Closed Won | 5 | 1.00 | 100% |
| Closed Lost | 6 | 0.00 | 0% |

### 3. UI Components
- **StageProbabilitiesForm**: Main component for managing probabilities
- **Interactive sliders**: Real-time probability adjustment (0-100%)
- **Input fields**: Precise probability editing
- **Debounced updates**: API calls are debounced for better UX
- **Visual feedback**: Hover effects and clear stage information

### 4. Features
- **Real-time updates**: Changes are saved automatically with debouncing
- **Responsive design**: Works on all screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Error handling**: Graceful fallbacks when data is missing
- **Helpful messaging**: Clear instructions and tips for users

## How It Works

### 1. Data Flow
```
User adjusts slider → Local state updates → Debounced API call → Database update → Query invalidation → UI refresh
```

### 2. Probability Calculation
- Probabilities range from 0.0 (0%) to 1.0 (100%)
- Used in weighted pipeline calculations: `Deal Value × Stage Probability = Weighted Value`
- Helps forecast pipeline value and conversion rates

### 3. Default Values Logic
- **Early stages** (Lead, Qualified): Low win rates (5-15%)
- **Middle stages** (Proposal, Negotiation): Medium win rates (30-60%)
- **Final stages** (Closed Won/Lost): 100% or 0% respectively

## Usage

### 1. Viewing Probabilities
- Navigate to Settings → Stage Probabilities
- See all stages with current probabilities
- View stage positions and names

### 2. Adjusting Probabilities
- **Slider method**: Drag slider for quick adjustments
- **Input method**: Click "Edit" button for precise values
- **Keyboard support**: Use Enter to save, Escape to cancel

### 3. Best Practices
- **Lead stage**: 5-10% (early qualification)
- **Qualified stage**: 15-25% (basic qualification)
- **Proposal stage**: 25-40% (proposal sent)
- **Negotiation stage**: 50-70% (active negotiation)
- **Closed Won**: Always 100%
- **Closed Lost**: Always 0%

## Technical Implementation

### 1. Database Migration
```sql
-- Creates default pipeline and stages
-- Sets realistic default probabilities
-- Grants necessary permissions
```

### 2. React Components
- Uses React Hook Form for state management
- Implements debouncing for API calls
- Optimistic UI updates for better UX

### 3. API Integration
- `useStageProbabilities`: Fetches current probabilities
- `useUpdateStageProbability`: Updates individual probabilities
- Automatic query invalidation for data consistency

### 4. Error Handling
- Graceful fallbacks when no data exists
- Helpful error messages for users
- Loading states during API calls

## Testing

### 1. Unit Tests
- Service layer testing
- Hook testing with mocked data
- Error handling validation

### 2. E2E Tests
- Complete user workflow testing
- Probability adjustment verification
- UI responsiveness testing

## Future Enhancements

### 1. Multiple Pipelines
- Support for different sales processes
- Pipeline-specific probability sets
- Template-based pipeline creation

### 2. Advanced Analytics
- Historical probability tracking
- Performance-based recommendations
- A/B testing for probability values

### 3. Integration Features
- Import/export probability sets
- Bulk probability updates
- Probability validation rules

## Troubleshooting

### 1. No Stages Visible
- Run the database migration
- Check if pipeline data exists
- Verify database permissions

### 2. Probabilities Not Saving
- Check API endpoint availability
- Verify user authentication
- Check database constraints

### 3. UI Not Updating
- Clear browser cache
- Check React Query invalidation
- Verify component re-renders

## Conclusion

The Stage Probabilities feature provides a solid foundation for sales pipeline management and forecasting. With realistic defaults and an intuitive interface, users can quickly configure their sales process and start using weighted pipeline calculations immediately.

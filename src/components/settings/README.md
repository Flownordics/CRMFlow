# Settings Components

This directory contains the settings functionality for CRMFlow, allowing users to configure workspace branding, document numbering, default values, and stage probabilities.

## Components

### BrandingForm
- **Purpose**: Configure organization branding and appearance
- **Fields**: Organization name, logo URL, PDF footer
- **Features**: Edit/view modes, form validation, optimistic updates

### NumberingForm
- **Purpose**: Configure document numbering strategy
- **Fields**: Quote/Order/Invoice prefixes, padding, year infix
- **Features**: Live preview of document number format, form validation

### DefaultsForm
- **Purpose**: Set default values for new documents and deals
- **Fields**: Default currency (DKK/EUR/USD), default tax percentage
- **Features**: Dropdown selection, number input validation

### StageProbabilitiesForm
- **Purpose**: Configure win probability for each pipeline stage
- **Features**: Slider controls, inline editing, real-time updates
- **Integration**: Affects weighted pipeline calculation in DealsKpiHeader

## Hooks

### useWorkspaceSettings()
- Fetches current workspace settings
- Returns settings data, loading state, and error state

### useUpdateWorkspaceSettings()
- Updates workspace settings with optimistic updates
- Handles rollback on error
- Shows success/error toasts

### useStageProbabilities()
- Fetches stage probability data with stage information
- Ordered by stage position

### useUpdateStageProbability()
- Updates individual stage probabilities
- Optimistic updates with rollback
- Invalidates related queries

## API Integration

All components use Supabase REST API with proper headers:
- `apikey`: Supabase anon key
- `Authorization`: Bearer token (falls back to anon key)
- `Prefer`: return=representation, count=exact
- `Prefer`: resolution=merge-duplicates (for upserts)

## Database Schema

### workspace_settings
- Single row per workspace
- Includes branding, numbering, and default settings
- Auto-created on first save

### stage_probabilities
- One row per pipeline stage
- Probability values 0-1 (0-100%)
- Foreign key to stages table

## Usage Example

```tsx
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from "@/hooks/useSettings";

function MyComponent() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const updateSettings = useUpdateWorkspaceSettings();
  
  const handleSave = async (newData) => {
    await updateSettings.mutateAsync(newData);
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Organization: {settings?.org_name}</div>;
}
```

## Testing

Each component includes comprehensive tests covering:
- Initial render states
- Edit mode transitions
- Form submission
- Error handling
- Edge cases (null settings, etc.)

Run tests with: `npm test -- src/components/settings/`

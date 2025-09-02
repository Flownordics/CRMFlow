# Design System

## Layout Policy

### Page Structure
All pages follow a consistent layout structure to ensure uniformity across the application:

```
┌─────────────────────────────────────┐
│ PageHeader (title + subtitle + actions) │
├─────────────────────────────────────┤
│ Gradient Separator                  │
├─────────────────────────────────────┤
│ KPI Cards/Header                    │
├─────────────────────────────────────┤
│ Search and Filters Section          │
│ ├─ Search + Export (top row)        │
│ ├─ View Mode Toggle (top row)       │
│ └─ Status/Type Filters (bottom row) │
├─────────────────────────────────────┤
│ Content Area                        │
│ ├─ Table View                       │
│ ├─ Grid View                        │
│ └─ Empty State                      │
└─────────────────────────────────────┘
```

### Spacing and Padding
- **Container**: `space-y-6 p-6` for all pages
- **Section gaps**: `gap-4` between major sections
- **Component spacing**: `space-y-4` within sections

### Gradient Separator
All pages use the same gradient separator:
```tsx
<div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />
```

### Search and Filters Layout
Consistent structure across all pages:

```tsx
<div className="flex flex-col gap-4">
  {/* Top row: Search + Export + View Toggle */}
  <div className="flex items-center justify-between gap-4">
    <div className="flex max-w-md gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input placeholder="Search..." className="pl-10" />
      </div>
      <Button variant="outline">
        <Filter className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
    
    {/* View Mode Toggle (if applicable) */}
    <div className="flex items-center gap-2">
      <Button variant="default" size="sm">Table</Button>
      <Button variant="outline" size="sm">Grid</Button>
    </div>
  </div>

  {/* Bottom row: Status/Type Filters */}
  <StatusFilters />
</div>
```

### Table Styling
- Use standard `<Table>` component from shadcn/ui
- Consistent hover states: `hover:bg-muted/30 transition`
- Proper spacing and alignment

### View Mode Toggles
- Consistent styling across pages
- Table/Grid toggle when applicable
- Proper button variants and sizing

### Page Headers
All pages use the `PageHeader` component with:
- Title
- Subtitle (descriptive text)
- Actions (primary action button)

### KPI Headers
- Consistent card layout
- Proper spacing and typography
- Responsive grid system

## Color System

### Primary Colors
- Primary: Blue-based brand color
- Accent: Complementary color for highlights
- Muted: Subtle backgrounds and borders

### Status Colors
- Success: Green for positive states
- Warning: Yellow/Orange for caution
- Danger: Red for errors/overdue
- Info: Blue for neutral information

## Typography

### Headings
- Page titles: Large, bold
- Section headers: Medium, semibold
- Card titles: Small, medium weight

### Body Text
- Primary: Regular weight
- Secondary: Muted color, smaller size
- Captions: Very small, muted

## Component Guidelines

### Buttons
- Primary actions: Default variant
- Secondary actions: Outline variant
- Destructive actions: Destructive variant
- Icon buttons: Ghost variant with proper sizing

### Cards
- Consistent padding: `p-6`
- Rounded corners: `rounded-2xl`
- Subtle shadows: `shadow-card`
- Proper hover states

### Forms
- Consistent spacing between fields
- Proper label positioning
- Error state styling
- Success state feedback

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Considerations
- Stack elements vertically
- Full-width buttons
- Simplified navigation
- Touch-friendly targets

## Accessibility

### ARIA Labels
- Proper labeling for interactive elements
- Screen reader friendly navigation
- Keyboard navigation support

### Color Contrast
- WCAG AA compliant contrast ratios
- Not relying solely on color for information
- High contrast mode support

### Focus States
- Visible focus indicators
- Logical tab order
- Skip links for main content

## Animation Guidelines

### Transitions
- Subtle hover effects: `transition-colors`
- Smooth state changes: `transition-all`
- Consistent timing: 150ms-200ms

### Loading States
- Skeleton loaders for content
- Spinner for actions
- Progressive disclosure

## Icon Usage

### Sizing
- Small: `h-4 w-4` (16px)
- Medium: `h-5 w-5` (20px)
- Large: `h-6 w-6` (24px)

### Positioning
- Consistent alignment with text
- Proper spacing in buttons
- Accessible descriptions

## Best Practices

### Performance
- Lazy loading for large lists
- Optimized images
- Efficient re-renders

### Code Organization
- Consistent file structure
- Reusable components
- Proper TypeScript types

### Testing
- Component testing
- Integration testing
- Accessibility testing

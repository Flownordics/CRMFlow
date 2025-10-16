# CRMFlow Mobile Development Guide

## Overview

This guide outlines the mobile-first development principles, touch optimization guidelines, performance best practices, and testing procedures for CRMFlow. Our goal is to deliver a first-class mobile experience that matches desktop functionality while optimizing for touch interactions, network conditions, and device capabilities.

## Mobile-First Development Principles

### 1. Progressive Enhancement

Start with mobile and enhance for larger screens:
- Design for mobile viewports first (320px - 768px)
- Add features progressively for tablet (768px - 1024px)
- Enhance with desktop features (1024px+)

### 2. Touch-First Interactions

All interactive elements must be optimized for touch:
- Minimum touch target size: **44x44px** (iOS) / **48x48px** (Android)
- Add `touch-manipulation` CSS class to prevent double-tap zoom
- Include active states with visual feedback (`active:scale-[0.98]`)
- Provide haptic feedback for important actions

### 3. Performance Budget

Strict performance targets for mobile:
- **Initial Load**: < 2.5 seconds on 4G
- **Time to Interactive**: < 3.5 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Lighthouse Mobile Score**: > 90
- **Bundle Size**: < 500kb initial (gzipped)

## Touch Optimization Guidelines

### Button Components

Always use the `Button` component with appropriate sizes:

```tsx
import { Button } from "@/components/ui/button";

// Default button (44px height)
<Button>Click Me</Button>

// Large button (48px height)
<Button size="lg">Large Action</Button>

// Icon button (44x44px)
<Button size="icon">
  <Icon className="h-5 w-5" />
</Button>
```

### Form Inputs

Use optimized form components with mobile-friendly sizes:

```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Input automatically adjusts to h-12 on mobile
<Input type="email" placeholder="Email" />

// Textarea with larger touch area on mobile
<Textarea placeholder="Your message" />
```

Always specify correct input types for native keyboard support:
- `type="email"` - Email keyboard
- `type="tel"` - Phone number keyboard
- `type="number"` - Numeric keyboard
- `type="url"` - URL keyboard

### Touch Gestures

Implement standard mobile gestures:

**Pull-to-Refresh:**
```tsx
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

function MyList() {
  const { isPulling, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
  });

  return (
    <div>
      {isRefreshing && <LoadingSpinner />}
      {/* Your content */}
    </div>
  );
}
```

**Swipe Gestures:**
```tsx
import { useSwipeable } from "react-swipeable";

function SwipeableCard() {
  const handlers = useSwipeable({
    onSwipedLeft: () => handleDelete(),
    onSwipedRight: () => handleArchive(),
  });

  return <div {...handlers}>Swipeable content</div>;
}
```

### Haptic Feedback

Provide tactile feedback for important interactions:

```tsx
import { hapticClick, hapticSuccess, hapticError } from "@/lib/haptics";

function ActionButton() {
  const handleClick = async () => {
    hapticClick(); // Light vibration on press
    
    try {
      await performAction();
      hapticSuccess(); // Success pattern
    } catch (error) {
      hapticError(); // Error pattern
    }
  };

  return <Button onClick={handleClick}>Action</Button>;
}
```

## Responsive Design Patterns

### Breakpoints

Use Tailwind's mobile-first breakpoints:

```tsx
// Mobile-first approach
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

Custom breakpoints:
- `xs`: 475px (small phones)
- `sm`: 640px (large phones)
- `md`: 768px (tablets)
- `lg`: 1024px (small desktops)
- `xl`: 1280px (desktops)
- `2xl`: 1536px (large desktops)

### Navigation Patterns

**Mobile Navigation:**
- Bottom navigation bar for primary actions (Dashboard, Companies, Deals, People, More)
- Hamburger menu (Sheet) for secondary actions
- Fixed mobile header with branding
- Floating Action Button (FAB) for context-aware quick actions

**Desktop Navigation:**
- Sidebar with full navigation
- Collapsible sidebar for more screen space

### Dialog/Modal Patterns

Dialogs automatically adapt to screen size:
- **Mobile**: Fullscreen overlay
- **Desktop**: Centered modal

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";

<Dialog>
  <DialogContent>
    {/* Automatically fullscreen on mobile, modal on desktop */}
  </DialogContent>
</Dialog>
```

### Safe Areas

Always respect iOS safe areas (notch and home indicator):

```tsx
// Use safe area utilities
<div className="safe-area-pb">
  {/* Content respects bottom safe area */}
</div>

// Or use inline styles for dynamic values
<div style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
  {/* Content */}
</div>
```

## Performance Best Practices

### Code Splitting

Lazy load heavy components:

```tsx
import { lazy } from "react";

// Lazy load chart components
const RevenueChart = lazy(() => import("@/components/dashboard/RevenueChart"));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <RevenueChart />
    </Suspense>
  );
}
```

### Image Optimization

Use the OptimizedImage component:

```tsx
import { OptimizedImage } from "@/components/common/OptimizedImage";

<OptimizedImage
  src="/large-image.jpg"
  webpSrc="/large-image.webp"
  alt="Description"
  lazy={true}
  className="w-full h-auto"
/>
```

### Virtual Scrolling

For long lists (> 50 items), use virtual scrolling:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function LongList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### React Query Optimization

Leverage React Query's caching:

```tsx
import { useQuery } from "@tanstack/react-query";

function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Prefetch for predictable navigation
const queryClient = useQueryClient();
queryClient.prefetchQuery({
  queryKey: ["company", id],
  queryFn: () => fetchCompany(id),
});
```

## Progressive Web App (PWA)

### Installation

The app automatically prompts users to install on mobile. The prompt respects user preferences and can be dismissed.

### Offline Support

- Service worker caches critical assets
- Network-first strategy for API calls
- Offline indicator shows connection status
- Failed requests retry automatically when back online

### App Shortcuts

PWA shortcuts provide quick access:
- Dashboard
- Companies
- Deals

Access via long-press on app icon (Android) or 3D Touch (iOS).

## Testing Procedures

### Manual Testing Checklist

Test on physical devices when possible:

**Navigation:**
- [ ] Bottom nav displays correctly on mobile
- [ ] All nav items are tappable (44x44px minimum)
- [ ] Active states are visible
- [ ] Hamburger menu slides in smoothly
- [ ] Can access all app sections from mobile nav

**Touch Interactions:**
- [ ] All buttons respond to touch
- [ ] No accidental double-taps
- [ ] Swipe gestures work smoothly
- [ ] Pull-to-refresh refreshes data
- [ ] Haptic feedback on supported devices

**Forms:**
- [ ] Inputs are large enough to tap
- [ ] Correct keyboard types appear
- [ ] No zoom on focus (16px minimum font size)
- [ ] Can submit forms on mobile
- [ ] Validation messages are visible

**Responsive Layout:**
- [ ] Content adapts to all screen sizes
- [ ] No horizontal scrolling (unless intentional)
- [ ] Images scale appropriately
- [ ] Dialogs are fullscreen on mobile
- [ ] Safe areas respected on iOS

**Performance:**
- [ ] Initial load < 2.5s on 4G
- [ ] Smooth scrolling (60fps)
- [ ] No layout shifts during load
- [ ] Images lazy load correctly

### Automated Testing

Run Playwright mobile tests:

```bash
# Test on mobile viewports
npm run test:e2e -- --project=mobile

# Test specific mobile features
npm run test:e2e -- mobile-navigation.spec.ts
npm run test:e2e -- mobile-touch-gestures.spec.ts
npm run test:e2e -- mobile-performance.spec.ts
```

### Performance Testing

Use Lighthouse for mobile audits:

```bash
# Run Lighthouse in mobile mode
lighthouse https://yourapp.com --preset=mobile --view
```

Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90
- PWA: 100

## Common Patterns

### Loading States

Always provide loading feedback:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function DataCard() {
  const { data, isLoading } = useQuery(["data"]);

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-full" />
      </Card>
    );
  }

  return <Card>{/* Actual content */}</Card>;
}
```

### Error States

Handle errors gracefully:

```tsx
function DataList() {
  const { data, error } = useQuery(["data"]);

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-muted-foreground">Failed to load data</p>
        <Button onClick={() => refetch()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return <List items={data} />;
}
```

### Empty States

Provide guidance when no data exists:

```tsx
import { EmptyState } from "@/components/EmptyState";

function CompaniesList() {
  const { data } = useQuery(["companies"]);

  if (!data?.length) {
    return (
      <EmptyState
        icon={Building2}
        title="No companies yet"
        description="Create your first company to get started"
        action={
          <Button onClick={() => navigate("/companies/new")}>
            Add Company
          </Button>
        }
      />
    );
  }

  return <List companies={data} />;
}
```

## Accessibility

### Touch Target Sizes

- Minimum: **44x44px** (iOS) / **48x48px** (Android)
- Recommended: **48x48px** for all platforms
- Spacing: Minimum **8px** between interactive elements

### Screen Reader Support

- Use semantic HTML (`nav`, `main`, `article`, etc.)
- Provide `aria-label` for icon-only buttons
- Use `aria-hidden="true"` for decorative icons
- Mark decorative images with empty alt (`alt=""`)

### Color Contrast

- Normal text: 4.5:1 minimum (WCAG AA)
- Large text: 3:1 minimum (WCAG AA)
- Test in both light and dark modes

### Keyboard Navigation (Tablets)

- All interactive elements focusable
- Visible focus indicators
- Logical tab order
- Support for `Enter` and `Space` keys

## Troubleshooting

### Common Issues

**Issue: Zoom on input focus**
- **Solution**: Ensure input font-size is at least 16px

**Issue: Horizontal scrolling**
- **Solution**: Use `overflow-x-hidden` on container, check for fixed-width elements

**Issue: Touch targets too small**
- **Solution**: Use `min-h-[44px] min-w-[44px]` on all interactive elements

**Issue: iOS notch overlapping content**
- **Solution**: Use `safe-area-inset` CSS variables

**Issue: Slow performance on mobile**
- **Solution**: Check bundle size, implement code splitting, use virtual scrolling

**Issue: PWA not installable**
- **Solution**: Verify manifest.json, ensure HTTPS, check service worker registration

## Resources

### Tools

- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Can I Use](https://caniuse.com/) - Browser support

### References

- [iOS Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures/)
- [Material Design - Touch Targets](https://m3.material.io/foundations/accessible-design/accessibility-basics#28032e45-c598-450c-b355-f9fe737b1cd8)
- [Web.dev - Mobile Best Practices](https://web.dev/mobile/)
- [PWA Builder](https://www.pwabuilder.com/)

## Conclusion

Building for mobile requires attention to detail and continuous testing. Follow these guidelines to ensure CRMFlow delivers an excellent mobile experience that users love. When in doubt, test on real devices and prioritize user experience over feature complexity.

For questions or improvements to this guide, contact the development team.


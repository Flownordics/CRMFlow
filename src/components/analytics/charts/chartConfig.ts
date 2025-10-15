// Shared chart configuration and theme for all analytics charts

export const chartColors = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: '#b5c69f', // Sage green (muted)
  warning: '#d4a574', // Muted gold
  danger: '#fb8674', // Muted coral
  info: '#7a9db3', // Muted blue-grey
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  
  // Activity colors - muted palette
  call: '#7a9db3', // Muted blue-grey
  email: '#9d94af', // Muted purple
  meeting: '#b5c69f', // Sage green
  note: '#d4a574', // Muted gold
  task: '#fb8674', // Muted coral
  deal: '#7fa39b', // Muted teal
  quote: '#c89882', // Soft terracotta
  order: '#95a39c', // Grey-green
  invoice: '#d4a574', // Muted gold
  payment: '#b5c69f', // Sage green
  
  // Status colors - muted
  green: '#b5c69f',
  yellow: '#d4a574',
  red: '#fb8674',
  
  // Chart palette (for multi-series) - muted tones
  palette: [
    '#7a9db3', // muted blue-grey
    '#9d94af', // muted purple
    '#b5c69f', // sage green
    '#d4a574', // muted gold
    '#fb8674', // muted coral
    '#7fa39b', // muted teal
    '#c89882', // soft terracotta
    '#95a39c', // grey-green
  ],
};

export const chartTheme = {
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  tooltipStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'hsl(var(--popover-foreground))',
  },
  axisStyle: {
    fontSize: 11,
    fill: 'hsl(var(--muted-foreground))',
  },
  gridStyle: {
    stroke: 'hsl(var(--border))',
    strokeOpacity: 0.3,
  },
  legendStyle: {
    fontSize: 12,
    fill: 'hsl(var(--foreground))',
  },
};

// Responsive container default props
export const defaultResponsiveProps = {
  width: '100%',
  height: 300,
};

// Common margin for charts
export const defaultMargin = {
  top: 10,
  right: 30,
  left: 0,
  bottom: 0,
};

// Animation duration
export const animationDuration = 750;

// Helper to get color by index
export function getChartColor(index: number): string {
  return chartColors.palette[index % chartColors.palette.length];
}

// Helper to get color by category name (for consistent coloring across charts)
export function getColorByCategory(category: string): string {
  const categoryColors: Record<string, string> = {
    // Status colors
    draft: chartColors.info,
    sent: chartColors.warning,
    accepted: chartColors.success,
    declined: chartColors.danger,
    expired: chartColors.danger,
    pending: chartColors.warning,
    confirmed: chartColors.success,
    delivered: chartColors.success,
    cancelled: chartColors.danger,
    paid: chartColors.success,
    overdue: chartColors.danger,
    partial: chartColors.warning,
    
    // Activity colors
    call: chartColors.call,
    email: chartColors.email,
    meeting: chartColors.meeting,
    note: chartColors.note,
    task: chartColors.task,
    deal: chartColors.deal,
    quote: chartColors.quote,
    order: chartColors.order,
    invoice: chartColors.invoice,
    payment: chartColors.payment,

    // Activity status
    green: chartColors.green,
    yellow: chartColors.yellow,
    red: chartColors.red,

    // Priority
    low: chartColors.info,
    medium: chartColors.warning,
    high: chartColors.danger,
    urgent: chartColors.danger,
  };

  return categoryColors[category.toLowerCase()] || chartColors.primary;
}

// Helper to format activity type color
export function getActivityColor(type: string): string {
  const colorMap: Record<string, string> = {
    call: chartColors.call,
    email: chartColors.email,
    meeting: chartColors.meeting,
    note: chartColors.note,
    task: chartColors.task,
    deal: chartColors.deal,
    quote: chartColors.quote,
    order: chartColors.order,
    invoice: chartColors.invoice,
    payment: chartColors.payment,
  };
  
  return colorMap[type.toLowerCase()] || chartColors.primary;
}

// Helper to format status color
export function getStatusColor(status: 'green' | 'yellow' | 'red'): string {
  const colorMap = {
    green: chartColors.green,
    yellow: chartColors.yellow,
    red: chartColors.red,
  };
  
  return colorMap[status];
}


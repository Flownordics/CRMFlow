export const qk = {
  companies: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    industry?: string;
    country?: string;
  }) => ["companies", params ?? {}] as const,
  company: (id: string) => ["company", id] as const,
  companyPeople: (id: string) => ["company", id, "people"] as const,
  companyDeals: (id: string) => ["company", id, "deals"] as const,
  companyDocuments: (id: string) => ["company", id, "documents"] as const,
  companyActivities: (id: string) => ["company", id, "activities"] as const,

  people: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    company_id?: string;
    title?: string;
  }) => ["people", params ?? {}] as const,
  person: (id: string) => ["person", id] as const,
  personDeals: (id: string) => ["person", id, "deals"] as const,
  personDocuments: (id: string) => ["person", id, "documents"] as const,
  personActivities: (id: string) => ["person", id, "activities"] as const,

  pipelines: () => ["pipelines"] as const,
  deals: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    stage_id?: string;
    company_id?: string;
  }) => ["deals", params ?? {}] as const,
  deal: (id: string) => ["deal", id] as const,

  quotes: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    company_id?: string;
    dealId?: string;
  }) => ["quotes", params ?? {}] as const,
  quote: (id: string) => ["quote", id] as const,
  quoteStatusCounts: () => ["quotes", "statusCounts"] as const,

  orders: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    company_id?: string;
    dealId?: string;
  }) => ["orders", params ?? {}] as const,
  order: (id: string) => ["order", id] as const,

  invoices: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    company_id?: string;
    orderId?: string;
  }) => ["invoices", params ?? {}] as const,
  invoice: (id: string) => ["invoice", id] as const,
  accounting: (params?: Record<string, unknown>) => ['accounting', params ?? {}] as const,
  overdueInvoices: (p?: { limit?: number; offset?: number }) => ['invoices', 'overdue', p ?? {}] as const,
  recentInvoices: (p?: { limit?: number; offset?: number }) => ['invoices', 'recent', p ?? {}] as const,

  calendarEvents: (range?: { start: string; end: string }) =>
    ["calendarEvents", range] as const,
  calendarConnection: () => ["calendarConnection"] as const,
  events: (params?: { from: string; to: string; kinds?: string[]; dealId?: string; companyId?: string }) =>
    ["events", params ?? {}] as const,

  documents: (params?: {
    limit?: number;
    offset?: number;
    companyId?: string;
    dealId?: string;
    personId?: string;
    mimeLike?: string;
    q?: string;
  }) => ["documents", params ?? {}] as const,
  document: (id: string) => ["documents", id] as const,

  search: (q: string) => ["search", q] as const,

  activities: (params: { dealId: string }) => ["activities", params] as const,

  settings: () => ["settings"] as const,
  workspaceSettings: () => ["workspace_settings"] as const,
  stageProbabilities: () => ["stage_probabilities"] as const,
  stages: (pipelineId?: string) => ["stages", { pipelineId }] as const,
  userSettings: () => ["user_settings"] as const,

  integrations: {
    all: () => ["integrations"] as const,
    byKind: (kind: string) => ["integrations", "kind", kind] as const,
    gmail: () => ["integrations", "gmail"] as const,
    gmailEmail: () => ["integrations", "gmail", "email"] as const,
  },

  tasks: {
    all: () => ["tasks"] as const,
    list: (filters?: Record<string, unknown>) => ["tasks", "list", filters ?? {}] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    upcoming: () => ["tasks", "upcoming"] as const,
    overdue: () => ["tasks", "overdue"] as const,
    comments: (taskId: string) => ["tasks", "comments", taskId] as const,
    activities: (taskId: string) => ["tasks", "activities", taskId] as const,
  },
};

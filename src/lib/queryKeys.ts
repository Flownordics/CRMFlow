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
  
  // Payments
  payments: (params?: {
    limit?: number;
    offset?: number;
    invoice_id?: string;
    company_id?: string;
    from_date?: string;
    to_date?: string;
    method?: string;
  }) => ["payments", params ?? {}] as const,
  invoicePayments: (invoiceId: string) => ["payments", "invoice", invoiceId] as const,
  companyPayments: (companyId: string) => ["payments", "company", companyId] as const,

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
  users: () => ["users"] as const,
  usersWithProfiles: () => ["users", "with-profiles"] as const,
  userProfile: () => ["user_profile"] as const,

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

  projects: {
    list: (filters?: Record<string, unknown>) => ["projects", "list", filters ?? {}] as const,
    detail: (id: string | null | undefined) => ["project", id] as const,
  },

  taskTemplates: {
    all: () => ["taskTemplates"] as const,
    list: (filters?: Record<string, unknown>) => ["taskTemplates", "list", filters ?? {}] as const,
    detail: (id: string) => ["taskTemplates", "detail", id] as const,
    matching: (triggerType: string, triggerValue: string, companyId?: string) => 
      ["taskTemplates", "matching", triggerType, triggerValue, companyId] as const,
  },

  // Call Lists
  callLists: (params?: { mine?: boolean }) => ["callLists", params ?? {}] as const,
  callList: (id: string) => ["callList", id] as const,
  callListItems: (callListId: string) => ["callList", callListId, "items"] as const,

  // Activity Logs (company-level)
  companyActivityLogs: (companyId: string) => ["company", companyId, "activityLogs"] as const,
  
  // Company Tags
  companyTags: () => ["companyTags"] as const,
  companyTagsForCompany: (companyId: string) => ["company", companyId, "tags"] as const,
  
  // Company Notes
  companyNotes: (companyId: string) => ["company", companyId, "notes"] as const,
  
  // Email Templates
  emailTemplates: (type?: string) => ["emailTemplates", type ?? "all"] as const,
  emailTemplate: (id: string) => ["emailTemplate", id] as const,
  defaultEmailTemplate: (type: string) => ["emailTemplate", "default", type] as const,
};

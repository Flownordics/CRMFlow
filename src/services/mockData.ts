import { Pipeline, Stage } from "./pipelines";
import { Deal } from "./deals";

// Mock pipeline data
export const mockPipeline: Pipeline = {
  id: "default",
  name: "Default Sales Pipeline",
  stages: [
    { id: "prospecting", name: "Prospecting", order: 1 },
    { id: "qualified", name: "Qualified", order: 2 },
    { id: "proposal", name: "Proposal", order: 3 },
    { id: "negotiation", name: "Negotiation", order: 4 },
    { id: "closed-won", name: "Closed Won", order: 5 },
    { id: "closed-lost", name: "Closed Lost", order: 6 }
  ]
};

// Mock deals data
export const mockDeals: Deal[] = [
  {
    id: "1",
    title: "Enterprise Software License",
    companyId: "company-1",
    contactId: "contact-1",
    stageId: "negotiation",
    currency: "DKK",
    defaultTaxPct: 25,
    notes: "High priority deal",
    expectedValue: 1500000, // 15,000 DKK in minor units
    closeDate: "2024-12-31T00:00:00.000Z",
    lines: [
      {
        id: "line-1",
        description: "Enterprise License",
        qty: 1,
        unitMinor: 1500000, // 15,000 DKK
        taxPct: 25
      }
    ]
  },
  {
    id: "2",
    title: "Website Redesign Project",
    companyId: "company-2",
    contactId: "contact-2",
    stageId: "proposal",
    currency: "DKK",
    defaultTaxPct: 25,
    notes: "Design-focused project",
    expectedValue: 850000, // 8,500 DKK in minor units
    closeDate: null,
    lines: [
      {
        id: "line-2",
        description: "Website Design",
        qty: 1,
        unitMinor: 850000, // 8,500 DKK
        taxPct: 25
      }
    ]
  },
  {
    id: "3",
    title: "Marketing Campaign",
    companyId: "company-3",
    contactId: "contact-3",
    stageId: "closed-won",
    currency: "DKK",
    defaultTaxPct: 25,
    notes: "Successful campaign",
    expectedValue: 2200000, // 22,000 DKK in minor units
    closeDate: "2024-11-15T00:00:00.000Z",
    lines: [
      {
        id: "line-3",
        description: "Marketing Services",
        qty: 1,
        unitMinor: 2200000, // 22,000 DKK
        taxPct: 25
      }
    ]
  }
];

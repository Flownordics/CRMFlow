import { api } from "@/lib/api";

export type AccountingSummary = {
  outstandingMinor: number;
  overdueMinor: number;
  paidMinor: number;
  aging: { "0-30": number; "31-60": number; "61-90": number; "90+": number };
};

export async function getAccountingSummary(params?: { from?: string; to?: string; currency?: string }): Promise<AccountingSummary> {
  const today = new Date().toISOString().slice(0, 10);

  // Outstanding: sum(balance_minor where balance_minor>0)
  const outstanding = await api.get("/invoices", {
    params: {
      select: "balance_minor",
      balance_minor: "gt.0",
      ...(params?.currency ? { currency: `eq.${params.currency}` } : {}),
      limit: 1000
    }
  });
  const outstandingMinor = (Array.isArray(outstanding.data) ? outstanding.data : []).reduce((s: number, r: { balance_minor?: number }) => s + (r.balance_minor ?? 0), 0);

  // Overdue: balance>0 && due_date < today
  const overdue = await api.get("/invoices", {
    params: {
      select: "balance_minor,due_date",
      balance_minor: "gt.0",
      due_date: `lt.${today}`,
      ...(params?.currency ? { currency: `eq.${params.currency}` } : {}),
      limit: 1000
    }
  });
  const overdueMinor = (Array.isArray(overdue.data) ? overdue.data : []).reduce((s: number, r: { balance_minor?: number }) => s + (r.balance_minor ?? 0), 0);

  // Paid in period (fallback: invoices set to fully paid and updated in range)
  let paidMinor = 0;
  if (params?.from || params?.to) {
    const upd: Record<string, string> = { select: "total_minor,balance_minor,updated_at", limit: "1000" };
    if (params?.from) upd.updated_at = `gte.${params.from}`;
    if (params?.to) upd.updated_at = (upd.updated_at ? `${upd.updated_at},lte.${params.to}` : `lte.${params.to}`);
    if (params?.currency) upd.currency = `eq.${params.currency}`;
    const paidResp = await api.get("/invoices", { params: upd });
    paidMinor = (Array.isArray(paidResp.data) ? paidResp.data : [])
      .filter((r: { balance_minor?: number }) => (r.balance_minor ?? 0) === 0)
      .reduce((s: number, r: { total_minor?: number }) => s + (r.total_minor ?? 0), 0);
  }

  // Aging buckets (kun på overdue)
  const overdueRows = (Array.isArray(overdue.data) ? overdue.data : []);
  const aging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const now = new Date();
  for (const r of overdueRows) {
    if (!r.due_date) continue;
    const diffDays = Math.floor((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const bal = r.balance_minor ?? 0;
    if (diffDays <= 30) aging["0-30"] += bal;
    else if (diffDays <= 60) aging["31-60"] += bal;
    else if (diffDays <= 90) aging["61-90"] += bal;
    else aging["90+"] += bal;
  }

  return { outstandingMinor, overdueMinor, paidMinor, aging };
}

export async function listOverdueInvoices({ limit = 10, offset = 0 } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api.get("/invoices", {
    params: {
      select: "id,number,company_id,due_date,currency,total_minor,paid_minor,balance_minor,status,updated_at",
      balance_minor: "gt.0",
      due_date: `lt.${today}`,
      order: "due_date.asc",
      limit, offset
    }
  });
  return res.data ?? [];
}

export async function listRecentlyUpdatedInvoices({ limit = 10, offset = 0 } = {}) {
  const res = await api.get("/invoices", {
    params: {
      select: "id,number,company_id,due_date,currency,total_minor,paid_minor,balance_minor,status,updated_at",
      order: "updated_at.desc",
      limit, offset
    }
  });
  return res.data ?? [];
}

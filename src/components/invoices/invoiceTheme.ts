import { FileText, Send, CheckCircle2, AlertTriangle, FileWarning } from "lucide-react";

export const invoiceTheme = {
    draft: { color: "muted", icon: FileText },
    sent: { color: "accent", icon: Send },
    paid: { color: "success", icon: CheckCircle2 },
    overdue: { color: "danger", icon: AlertTriangle },
} as const;

export function getInvoiceTheme(status?: string) {
    if (!status) return { color: "muted", icon: FileWarning };
    const key = status.toLowerCase() as keyof typeof invoiceTheme;
    return invoiceTheme[key] ?? { color: "muted", icon: FileWarning };
}

// Tailwind token helpers (ingen hex)
export function tokenBg(color: string) {
    return color === "brand-secondary" ? "bg-secondary/10" : `bg-${color}/10`;
}
export function tokenText(color: string) {
    return color === "brand-secondary" ? "text-secondary-foreground" : `text-${color}`;
}
export function tokenRing(color: string) {
    return color === "brand-secondary" ? "ring-secondary/30" : `ring-${color}/30`;
}

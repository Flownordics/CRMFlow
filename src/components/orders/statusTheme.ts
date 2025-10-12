import { CheckCircle, XCircle, Clock, Package, FileText, Circle } from "lucide-react";

export const orderStatusTheme = {
    draft: {
        icon: Circle,
        color: "text-[hsl(210,5%,35%)]",
        bgColor: "bg-[hsl(210,5%,39%)]/15",
    },
    accepted: {
        icon: CheckCircle,
        color: "text-[#6b7c5e]",
        bgColor: "bg-[#f0f4ec]",
    },
    cancelled: {
        icon: XCircle,
        color: "text-[#b8695f]",
        bgColor: "bg-[#fef2f0]",
    },
    backorder: {
        icon: Clock,
        color: "text-[#9d855e]",
        bgColor: "bg-[#faf5ef]",
    },
    invoiced: {
        icon: FileText,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
    },
} as const;

export function getOrderStatusTheme(status?: string) {
    if (!status) return orderStatusTheme.draft;
    const key = status.toLowerCase();
    return (orderStatusTheme as any)[key] ?? orderStatusTheme.draft;
}

export function statusTokenBg(color: string) {
    if (color === "secondary") return "bg-secondary/10";
    return `bg-${color}/10`;
}

export function statusTokenText(color: string) {
    if (color === "secondary") return "text-secondary-foreground";
    return `text-${color}`;
}

export function statusTokenRing(color: string) {
    if (color === "secondary") return "ring-secondary/30";
    return `ring-${color}/30`;
}

import { CheckCircle, XCircle, Clock, Package, FileText, Circle } from "lucide-react";

export const orderStatusTheme = {
    draft: {
        icon: Circle,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
    },
    accepted: {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
    },
    cancelled: {
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
    },
    backorder: {
        icon: Clock,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
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

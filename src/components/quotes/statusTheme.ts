import {
    FileText, Send, CheckCircle2, XCircle, Hourglass, MessageSquare
} from "lucide-react";

export const quoteStatusTheme = {
    draft: { color: "draft", icon: FileText },
    sent: { color: "info", icon: Send },
    accepted: { color: "success", icon: CheckCircle2 },
    declined: { color: "danger", icon: XCircle },
    expired: { color: "warning", icon: Hourglass },
} as const;

export function getQuoteStatusTheme(status?: string) {
    if (!status) return { color: "draft", icon: MessageSquare };
    const key = status.toLowerCase();
    return (quoteStatusTheme as any)[key] ?? { color: "draft", icon: MessageSquare };
}

export function statusTokenBg(color: string) {
    if (color === "draft") return "bg-[hsl(210,5%,39%)]/15";
    if (color === "secondary") return "bg-secondary/10";
    return `bg-${color}/10`;
}

export function statusTokenText(color: string) {
    if (color === "draft") return "text-[hsl(210,5%,35%)]";
    if (color === "secondary") return "text-secondary-foreground";
    return `text-${color}`;
}

export function statusTokenRing(color: string) {
    if (color === "draft") return "ring-[hsl(210,5%,39%)]/25";
    if (color === "secondary") return "ring-secondary/30";
    return `ring-${color}/30`;
}

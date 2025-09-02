import { Handshake, FileText, MessagesSquare, Scale, Trophy, XCircle, Target } from "lucide-react";

export const stageTheme = {
    // navne kan justeres ift. jeres faktiske stages
    prospecting: { color: "accent", icon: Target },
    proposal: { color: "warning", icon: FileText },
    negotiation: { color: "secondary", icon: Scale },
    won: { color: "success", icon: Trophy },
    lost: { color: "danger", icon: XCircle },
    qualified: { color: "muted", icon: Handshake },
} as const;

export function getStageTheme(name?: string) {
    if (!name) return { color: "muted", icon: MessagesSquare };
    const key = name.toLowerCase();
    return stageTheme[key as keyof typeof stageTheme] ?? { color: "muted", icon: MessagesSquare };
}

// Hjælpere til Tailwind token-klasser (ingen hex)
export function stageTokenBg(color: string) {
    // fx 'bg-success/10' -> let tint
    if (color === "secondary") return "bg-secondary/10";
    return `bg-${color}/10`;
}
export function stageTokenText(color: string) {
    if (color === "secondary") return "text-secondary-foreground";
    return `text-${color}`;
}
export function stageTokenRing(color: string) {
    if (color === "secondary") return "ring-secondary/30";
    return `ring-${color}/30`;
}

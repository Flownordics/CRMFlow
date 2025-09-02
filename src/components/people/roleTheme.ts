import { User2, Briefcase, ShieldCheck, Headphones, Megaphone, Stethoscope, Rocket } from "lucide-react";

export const roleTheme = {
    ceo: { color: "accent", icon: ShieldCheck },
    cto: { color: "info", icon: Rocket },
    cfo: { color: "warning", icon: Briefcase },
    manager: { color: "secondary", icon: User2 },
    sales: { color: "success", icon: Megaphone },
    support: { color: "muted", icon: Headphones },
    healthcare: { color: "danger", icon: Stethoscope },
    other: { color: "muted", icon: User2 },
} as const;

export function getRoleTheme(title?: string) {
    if (!title) return roleTheme.other;
    const key = title.toLowerCase();
    const match = (Object.keys(roleTheme) as (keyof typeof roleTheme)[])
        .find(k => key.includes(k));
    return match ? roleTheme[match] : roleTheme.other;
}

export function roleTokenBg(color: string) {
    if (color === "secondary") return "bg-secondary/10";
    return `bg-${color}/10`;
}

export function roleTokenText(color: string) {
    if (color === "secondary") return "text-secondary-foreground";
    return `text-${color}`;
}

export function roleTokenRing(color: string) {
    if (color === "secondary") return "ring-secondary/30";
    return `ring-${color}/30`;
}

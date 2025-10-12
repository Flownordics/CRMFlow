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
    const bgMap: Record<string, string> = {
        accent: "bg-accent",
        info: "bg-blue-100 dark:bg-blue-950",
        warning: "bg-amber-100 dark:bg-amber-950",
        secondary: "bg-secondary",
        success: "bg-green-100 dark:bg-green-950",
        muted: "bg-muted",
        danger: "bg-red-100 dark:bg-red-950",
    };
    return bgMap[color] || "bg-muted";
}

export function roleTokenText(color: string) {
    const textMap: Record<string, string> = {
        accent: "text-accent-foreground",
        info: "text-[#5a7b8f] dark:text-[#7a9db3]",
        warning: "text-[#7d6a4a] dark:text-[#9d855e]",
        secondary: "text-secondary-foreground",
        success: "text-[#6b7c5e] dark:text-[#b5c69f]",
        muted: "text-muted-foreground",
        danger: "text-[#b8695f] dark:text-[#fb8674]",
    };
    return textMap[color] || "text-muted-foreground";
}

export function roleTokenRing(color: string) {
    const ringMap: Record<string, string> = {
        accent: "ring-accent/50",
        info: "ring-blue-300/50",
        warning: "ring-amber-300/50",
        secondary: "ring-secondary/50",
        success: "ring-green-300/50",
        muted: "ring-muted-foreground/30",
        danger: "ring-red-300/50",
    };
    return ringMap[color] || "ring-muted-foreground/30";
}

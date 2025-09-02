import { CalendarClock, Phone, Users, Briefcase, Bell, Landmark } from "lucide-react";

export const eventTypeTheme = {
    meeting: { color: "accent", icon: Users },
    call: { color: "info", icon: Phone },
    focus: { color: "muted", icon: Briefcase },
    deadline: { color: "warning", icon: Bell },
    travel: { color: "secondary", icon: Landmark },
    other: { color: "success", icon: CalendarClock },
} as const;

export function getEventTheme(kind?: string) {
    if (!kind) return eventTypeTheme.other;
    const key = kind.toLowerCase();
    return (eventTypeTheme as any)[key] ?? eventTypeTheme.other;
}

export function tokenBg(color: string) {
    if (color === "secondary") return "bg-secondary/10";
    return `bg-${color}/10`;
}

export function tokenText(color: string) {
    if (color === "secondary") return "text-secondary-foreground";
    return `text-${color}`;
}

export function tokenRing(color: string) {
    if (color === "secondary") return "ring-secondary/30";
    return `ring-${color}/30`;
}

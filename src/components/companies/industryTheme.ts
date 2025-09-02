import { Building2, Briefcase, ShoppingCart, GraduationCap, HeartPulse, Factory, Globe, Banknote, Car, Plane, Home, Wifi } from "lucide-react";

export const industryTheme = {
    software: { color: "accent", icon: Briefcase },
    technology: { color: "accent", icon: Wifi },
    retail: { color: "warning", icon: ShoppingCart },
    education: { color: "success", icon: GraduationCap },
    healthcare: { color: "destructive", icon: HeartPulse },
    manufacturing: { color: "secondary", icon: Factory },
    finance: { color: "primary", icon: Banknote },
    automotive: { color: "muted", icon: Car },
    travel: { color: "accent", icon: Plane },
    real_estate: { color: "warning", icon: Home },
    other: { color: "muted", icon: Globe },
} as const;

export function getIndustryTheme(name?: string) {
    if (!name) return industryTheme.other;
    const key = name.toLowerCase().replace(/\s+/g, '_');
    return industryTheme[key as keyof typeof industryTheme] ?? industryTheme.other;
}

export function industryTokenBg(color: string) {
    if (color === "secondary") return "bg-secondary/10";
    if (color === "muted") return "bg-muted/10";
    return `bg-${color}/10`;
}

export function industryTokenText(color: string) {
    if (color === "secondary") return "text-secondary-foreground";
    if (color === "muted") return "text-muted-foreground";
    return `text-${color}`;
}

export function industryTokenRing(color: string) {
    if (color === "secondary") return "ring-secondary/30";
    if (color === "muted") return "ring-muted/30";
    return `ring-${color}/30`;
}

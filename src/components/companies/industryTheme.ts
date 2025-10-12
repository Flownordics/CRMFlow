import { Building2, Briefcase, ShoppingCart, GraduationCap, HeartPulse, Factory, Globe, Banknote, Car, Plane, Home, Wifi } from "lucide-react";

// Using muted brand colors for a subtle, professional appearance
export const industryTheme = {
    software: { color: "brand-primary", icon: Briefcase },      // Blue-gray
    technology: { color: "brand-neutral", icon: Wifi },         // Muted green
    retail: { color: "brand-warm", icon: ShoppingCart },        // Warm gold
    education: { color: "brand-tertiary", icon: GraduationCap }, // Sage
    healthcare: { color: "brand-coral", icon: HeartPulse },     // Muted coral
    manufacturing: { color: "brand-muted", icon: Factory },     // Muted gray
    finance: { color: "brand-accent", icon: Banknote },         // Warm gold
    automotive: { color: "brand-earth", icon: Car },            // Earth red
    travel: { color: "brand-primary", icon: Plane },            // Blue-gray
    real_estate: { color: "brand-secondary", icon: Home },      // Cream
    other: { color: "brand-muted", icon: Globe },               // Muted gray
} as const;

export function getIndustryTheme(name?: string) {
    if (!name) return industryTheme.other;
    const key = name.toLowerCase().replace(/\s+/g, '_');
    return industryTheme[key as keyof typeof industryTheme] ?? industryTheme.other;
}

export function industryTokenBg(color: string) {
    // Map brand colors to background classes with muted opacity
    const bgMap: Record<string, string> = {
        "brand-primary": "bg-[hsl(212,30%,57%)]/15",
        "brand-muted": "bg-[hsl(210,5%,39%)]/15",
        "brand-accent": "bg-[hsl(28,62%,68%)]/15",
        "brand-secondary": "bg-[hsl(42,45%,85%)]/20",
        "brand-tertiary": "bg-[hsl(86,25%,70%)]/15",
        "brand-warm": "bg-[hsl(28,62%,68%)]/15",
        "brand-neutral": "bg-[hsl(150,7%,61%)]/15",
        "brand-coral": "bg-[hsl(8,95%,72%)]/15",
        "brand-earth": "bg-[hsl(12,44%,47%)]/15",
    };
    return bgMap[color] || "bg-muted/10";
}

export function industryTokenText(color: string) {
    // Map brand colors to text classes
    const textMap: Record<string, string> = {
        "brand-primary": "text-[hsl(212,30%,47%)]",
        "brand-muted": "text-[hsl(210,5%,35%)]",
        "brand-accent": "text-[hsl(28,62%,55%)]",
        "brand-secondary": "text-[hsl(42,45%,55%)]",
        "brand-tertiary": "text-[hsl(86,25%,45%)]",
        "brand-warm": "text-[hsl(28,62%,55%)]",
        "brand-neutral": "text-[hsl(150,7%,45%)]",
        "brand-coral": "text-[hsl(8,85%,60%)]",
        "brand-earth": "text-[hsl(12,44%,40%)]",
    };
    return textMap[color] || "text-muted-foreground";
}

export function industryTokenRing(color: string) {
    // Map brand colors to ring classes with subtle opacity
    const ringMap: Record<string, string> = {
        "brand-primary": "ring-[hsl(212,30%,57%)]/20",
        "brand-muted": "ring-[hsl(210,5%,39%)]/20",
        "brand-accent": "ring-[hsl(28,62%,68%)]/20",
        "brand-secondary": "ring-[hsl(42,45%,85%)]/25",
        "brand-tertiary": "ring-[hsl(86,25%,70%)]/20",
        "brand-warm": "ring-[hsl(28,62%,68%)]/20",
        "brand-neutral": "ring-[hsl(150,7%,61%)]/20",
        "brand-coral": "ring-[hsl(8,95%,72%)]/20",
        "brand-earth": "ring-[hsl(12,44%,47%)]/20",
    };
    return ringMap[color] || "ring-muted/30";
}

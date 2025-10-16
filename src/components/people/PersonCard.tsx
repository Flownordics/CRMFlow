import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getRoleColor } from "@/lib/chartUtils";
import { Mail, Phone } from "lucide-react";
import { Person } from "@/lib/schemas/person";
import { z } from "zod";

interface PersonCardProps {
    person: z.infer<typeof Person>;
    onClick?: () => void;
    className?: string;
}

export function PersonCard({ person, onClick, className }: PersonCardProps) {
    const roleColor = getRoleColor(person.title || undefined);
    const initials = (person.first_name?.[0] || "") + (person.last_name?.[0] || "");

    return (
        <Card
            className={cn(
                "p-4 rounded-2xl border bg-card shadow-card hover:shadow-hover transition cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center gap-3 mb-3">
                {/* Role color stripe */}
                <div 
                    className="w-1.5 h-10 rounded-sm" 
                    style={{ backgroundColor: roleColor }}
                    aria-hidden="true" 
                />

                {/* Avatar */}
                <Avatar 
                    className="h-10 w-10 ring-2"
                    style={{ borderColor: roleColor }}
                >
                    <AvatarFallback 
                        style={{ 
                            backgroundColor: `${roleColor}20`,
                            color: roleColor
                        }}
                    >
                        {initials || "?"}
                    </AvatarFallback>
                </Avatar>

                {/* Name and title */}
                <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                        {person.first_name} {person.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                        {person.title || "—"}
                    </div>
                </div>
            </div>

            {/* Contact information */}
            <div className="flex flex-wrap gap-2 text-xs">
                {person.email && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        {person.email}
                    </span>
                )}
                {person.phone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {person.phone}
                    </span>
                )}
            </div>
        </Card>
    );
}

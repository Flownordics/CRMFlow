import { Building2, Users, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RelationBadgeProps {
    type: "company" | "deal" | "person";
    name: string;
    onClick?: () => void;
    className?: string;
}

export function RelationBadge({ type, name, onClick, className }: RelationBadgeProps) {
    const getIcon = () => {
        switch (type) {
            case "company":
                return <Building2 className="w-3 h-3" />;
            case "deal":
                return <Handshake className="w-3 h-3" />;
            case "person":
                return <Users className="w-3 h-3" />;
        }
    };

    const getVariant = () => {
        switch (type) {
            case "company":
                return "default";
            case "deal":
                return "secondary";
            case "person":
                return "outline";
        }
    };

    return (
        <Badge
            variant={getVariant()}
            className={cn(
                "flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity",
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {getIcon()}
            <span className="truncate max-w-20">{name}</span>
        </Badge>
    );
}

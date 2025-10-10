import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityStatus } from "@/lib/schemas/callList";
import { getActivityStatusColor, getActivityStatusLabel, getDaysSinceActivity } from "@/services/activityLog";

interface ActivityStatusBadgeProps {
    status: ActivityStatus | null | undefined;
    lastActivityAt?: string | null;
    showLabel?: boolean;
}

export function ActivityStatusBadge({ status, lastActivityAt, showLabel = false }: ActivityStatusBadgeProps) {
    const color = getActivityStatusColor(status);
    const label = getActivityStatusLabel(status);
    const daysSince = getDaysSinceActivity(lastActivityAt);

    const tooltipContent = daysSince !== null
        ? `${label} - ${daysSince} dage siden sidste aktivitet`
        : label;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        {showLabel && (
                            <span className="text-sm text-muted-foreground">{label}</span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

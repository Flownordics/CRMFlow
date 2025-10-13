import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Task } from "@/services/tasks";

interface TaskPriorityBadgeProps {
    priority: Task['priority'];
    showLabel?: boolean;
}

export function TaskPriorityBadge({ priority, showLabel = true }: TaskPriorityBadgeProps) {
    const getPriorityConfig = (priority: Task['priority']) => {
        switch (priority) {
            case 'urgent':
                return {
                    color: 'bg-[#b8695f]',
                    label: 'Urgent',
                };
            case 'high':
                return {
                    color: 'bg-[#9d855e]',
                    label: 'High',
                };
            case 'medium':
                return {
                    color: 'bg-[#7a9db3]',
                    label: 'Medium',
                };
            case 'low':
                return {
                    color: 'bg-gray-400',
                    label: 'Low',
                };
            default:
                return {
                    color: 'bg-gray-400',
                    label: priority,
                };
        }
    };

    const config = getPriorityConfig(priority);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${config.color}`} />
                        {showLabel && (
                            <span className="text-sm text-muted-foreground">{config.label}</span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.label} Priority</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}


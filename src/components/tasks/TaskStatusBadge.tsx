import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Task } from "@/services/tasks";

interface TaskStatusBadgeProps {
    status: Task['status'];
    showLabel?: boolean;
}

export function TaskStatusBadge({ status, showLabel = false }: TaskStatusBadgeProps) {
    const getStatusConfig = (status: Task['status']) => {
        switch (status) {
            case 'pending':
                return {
                    color: 'bg-[#9d855e]',
                    label: 'Pending',
                };
            case 'in_progress':
                return {
                    color: 'bg-[#7a9db3]',
                    label: 'In Progress',
                };
            case 'completed':
                return {
                    color: 'bg-[#6b7c5e]',
                    label: 'Completed',
                };
            case 'cancelled':
                return {
                    color: 'bg-gray-400',
                    label: 'Cancelled',
                };
            default:
                return {
                    color: 'bg-gray-400',
                    label: status,
                };
        }
    };

    const config = getStatusConfig(status);

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
                    <p>{config.label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}


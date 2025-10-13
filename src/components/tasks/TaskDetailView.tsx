import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Calendar,
    Clock,
    User,
    Tag,
    Edit,
    CheckCircle,
    Link as LinkIcon,
} from "lucide-react";
import { Task, formatTaskDueDate } from "@/services/tasks";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { cn } from "@/lib/utils";

interface TaskDetailViewProps {
    task: Task | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (task: Task) => void;
}

export function TaskDetailView({ task, open, onOpenChange, onEdit }: TaskDetailViewProps) {
    if (!task) return null;

    const handleEdit = () => {
        onEdit?.(task);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl">{task.title}</DialogTitle>
                            {task.description && (
                                <DialogDescription className="text-base mt-2">
                                    {task.description}
                                </DialogDescription>
                            )}
                        </div>
                        <Button onClick={handleEdit} size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </DialogHeader>

                <Separator />

                <div className="space-y-6">
                    {/* Status and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">Status</div>
                                    <div className="flex items-center gap-2">
                                        <TaskStatusBadge status={task.status} showLabel={true} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">Priority</div>
                                    <div className="flex items-center gap-2">
                                        <TaskPriorityBadge priority={task.priority} showLabel={true} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Dates and Time */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Timeline</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {task.due_date && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Due:</span>
                                            <span className="font-medium">
                                                {formatTaskDueDate(task.due_date)}
                                            </span>
                                        </div>
                                    )}
                                    {task.estimated_hours && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Estimated:</span>
                                            <span className="font-medium">{task.estimated_hours}h</span>
                                        </div>
                                    )}
                                    {task.actual_hours && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Actual:</span>
                                            <span className="font-medium">{task.actual_hours}h</span>
                                        </div>
                                    )}
                                    {task.completed_at && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Completed:</span>
                                            <span className="font-medium">
                                                {new Date(task.completed_at).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assignment */}
                    {(task.assigned_to || task.assigned_by) && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium">Assignment</h3>
                                    <div className="space-y-2">
                                        {task.assigned_to && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Assigned to:</span>
                                                <span className="font-medium">{task.assigned_to}</span>
                                            </div>
                                        )}
                                        {task.assigned_by && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Assigned by:</span>
                                                <span className="font-medium">{task.assigned_by}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tags */}
                    {task.tags.length > 0 && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Related Entity */}
                    {task.related_type && task.related_id && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4" />
                                        Related
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">Type:</span>
                                        <Badge variant="outline" className="capitalize">
                                            {task.related_type}
                                        </Badge>
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-mono text-xs">{task.related_id}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Metadata</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div>
                                        <span>Created:</span>{" "}
                                        <span className="font-medium">
                                            {new Date(task.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span>Updated:</span>{" "}
                                        <span className="font-medium">
                                            {new Date(task.updated_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span>Visibility:</span>{" "}
                                        <Badge variant="outline" className="text-xs">
                                            {task.is_private ? "Private" : "Shared"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}


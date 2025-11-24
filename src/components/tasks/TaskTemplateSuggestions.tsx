import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';
import { TaskTemplate, useMatchingTaskTemplates } from '@/services/taskTemplates';
import { CreateTaskData } from '@/services/tasks';
import { cn } from '@/lib/utils';

interface TaskTemplateSuggestionsProps {
    triggerType: 'deal_stage' | 'entity_type';
    triggerValue: string;
    companyId?: string;
    onSelectTemplate: (template: TaskTemplate) => void;
    onDismiss?: () => void;
}

export function TaskTemplateSuggestions({
    triggerType,
    triggerValue,
    companyId,
    onSelectTemplate,
    onDismiss,
}: TaskTemplateSuggestionsProps) {
    const { data: templates, isLoading } = useMatchingTaskTemplates(triggerType, triggerValue, companyId);

    if (isLoading) {
        return null;
    }

    if (!templates || templates.length === 0) {
        return null;
    }

    return (
        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Suggested Tasks</CardTitle>
                    </div>
                    {onDismiss && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={onDismiss}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
                <CardDescription className="text-xs">
                    Based on {triggerType === 'deal_stage' ? 'deal stage' : 'entity type'}: {triggerValue}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    {templates.map((template) => (
                        <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-auto py-2 px-3 text-left"
                            onClick={() => onSelectTemplate(template)}
                        >
                            <div className="flex flex-col items-start gap-1 w-full">
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium text-sm">{template.title}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {template.priority}
                                    </Badge>
                                </div>
                                {template.task_description && (
                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                        {template.task_description}
                                    </span>
                                )}
                                {template.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {template.tags.map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}


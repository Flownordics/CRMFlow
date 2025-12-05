import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";

interface QuotesEmptyStateProps {
    title?: string;
    description?: string;
    actionText?: string;
    actionLink?: string;
    onCreateClick?: () => void;
}

export function QuotesEmptyState({
    title = "No quotes yet",
    description = "Create your first quote to get started with proposals and estimates.",
    actionText = "New Quote",
    actionLink = "/quotes/new",
    onCreateClick
}: QuotesEmptyStateProps) {
    const actionButton = onCreateClick ? (
                <Button onClick={onCreateClick}>
                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                    {actionText}
                </Button>
            ) : (
                <Button asChild>
                    <Link to={actionLink}>
                        <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                        {actionText}
                    </Link>
                </Button>
    );

    return (
        <EmptyState
            icon={FileText}
            title={title}
            description={description}
            action={actionButton}
        />
    );
}

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/10 p-4 mb-4">
                <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            </div>

            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">{description}</p>

            {onCreateClick ? (
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
            )}
        </div>
    );
}

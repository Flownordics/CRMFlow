import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';

type Props = {
    onGetUrl: () => Promise<string>;
    onLogged?: (url: string) => void;
    size?: "sm" | "default" | "lg" | "icon";
    className?: string;
    label?: string;
};

export function OpenPdfButton({
    onGetUrl,
    onLogged,
    size = "default",
    className,
    label = "Generate PDF"
}: Props) {
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        setLoading(true);
        try {
            const url = await onGetUrl();

            // Try to open in new tab
            const win = window.open(url, "_blank", "noopener,noreferrer");
            if (!win) {
                // Popup blocker → fallback: force navigation (same tab)
                window.location.href = url;
            }

            onLogged?.(url);
        } catch (err) {
            logger.error("[PDF] Failed to open PDF", err);
            // Optional: toast error
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="outline"
            size={size}
            onClick={handleClick}
            disabled={loading}
            aria-label={label}
            title={label}
            className={cn("gap-2", className)}
        >
            <FileDown className="h-4 w-4" aria-hidden="true" focusable="false" />
            {loading ? "Generating…" : label}
        </Button>
    );
}

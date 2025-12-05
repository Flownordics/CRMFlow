import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  blocked?: boolean; // If true, disable confirm button and show only close button
  showCloseOnly?: boolean; // If true, show only close button (no confirm)
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  blocked = false,
  showCloseOnly = false,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Disable pointer events on all dialogs below when this dialog is open
  React.useEffect(() => {
    if (!open) return;

    // Find all dialogs with lower z-index and disable their pointer events
    const dialogs = document.querySelectorAll('[class*="z-[999"]');
    dialogs.forEach((dialog) => {
      (dialog as HTMLElement).style.pointerEvents = 'none';
    });

    return () => {
      // Re-enable pointer events when dialog closes
      dialogs.forEach((dialog) => {
        (dialog as HTMLElement).style.pointerEvents = '';
      });
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <>
      {/* Overlay - must be separate element to block all interactions */}
      <div 
        className="fixed inset-0 bg-black/80"
        style={{ 
          zIndex: 20000,
          pointerEvents: 'auto',
        }}
        onClick={() => !isLoading && onOpenChange(false)}
      />
      
      {/* Dialog Content Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ 
          zIndex: 20001,
          pointerEvents: 'none', // Container doesn't block, but content does
        }}
      >
        {/* Dialog Content */}
        <div 
          className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-[425px] mx-4"
          style={{ 
            pointerEvents: 'auto', // Content blocks and handles clicks
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
              {!showCloseOnly && (
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="sm:mt-0"
                >
                  {cancelText}
                </Button>
              )}
              {!showCloseOnly && (
                <Button
                  variant={variant === "destructive" ? "destructive" : "default"}
                  onClick={handleConfirm}
                  disabled={isLoading || blocked}
                >
                  {isLoading ? "Processing..." : confirmText}
                </Button>
              )}
              {showCloseOnly && (
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render in portal to ensure it's outside any other dialogs
  return createPortal(content, document.body);
}
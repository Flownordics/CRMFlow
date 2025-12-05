import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { validateToken } from "@/services/quotePublicTokens";
import { trackEvent } from "@/services/quoteTracking";
import { useQuoteResponse } from "@/services/quoteResponses";
import { PublicQuoteViewer } from "@/components/quotes/PublicQuoteViewer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

export default function PublicQuoteView() {
  const { token } = useParams<{ token: string }>();
  const [validationState, setValidationState] = useState<{
    loading: boolean;
    valid: boolean;
    quoteId: string | null;
    tokenId: string | null;
    error?: string;
    expired?: boolean;
  }>({
    loading: true,
    valid: false,
    quoteId: null,
    tokenId: null,
  });

  // Get existing response if any
  const { data: existingResponse } = useQuoteResponse(
    validationState.quoteId || ""
  );

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidationState({
        loading: false,
        valid: false,
        quoteId: null,
        tokenId: null,
        error: "Missing token",
      });
      return;
    }

    const validate = async () => {
      try {
        const result = await validateToken(token);
        setValidationState({
          loading: false,
          valid: result.valid,
          quoteId: result.quoteId,
          tokenId: result.tokenId,
          error: result.error,
          expired: result.expired,
        });

        // Track 'viewed' event if token is valid
        if (result.valid && result.quoteId) {
          trackEvent({
            quoteId: result.quoteId,
            tokenId: result.tokenId || null,
            eventType: "viewed",
            metadata: { first_view: true },
          }).catch((err) => {
            logger.warn("Failed to track viewed event:", err);
          });
        }
      } catch (error) {
        logger.error("Error validating token:", error);
        setValidationState({
          loading: false,
          valid: false,
          quoteId: null,
          tokenId: null,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    validate();
  }, [token]);

  // Loading state
  if (validationState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!validationState.valid || !validationState.quoteId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {validationState.expired
              ? "This quote link has expired. Please contact the sender for a new link."
              : validationState.error === "Invalid token"
                ? "Invalid quote link. Please check the link and try again."
                : validationState.error || "Unable to load quote. Please contact support."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Success - render quote viewer
  return (
    <PublicQuoteViewer
      quoteId={validationState.quoteId!}
      tokenId={validationState.tokenId}
      existingResponse={existingResponse || undefined}
    />
  );
}

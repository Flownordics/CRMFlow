import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// React hooks
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from '@/lib/logger';
import { generateToken } from "./quotePublicTokens";
import { generatePublicUrl } from "@/lib/quotePublicUrl";
import { qk } from "@/lib/queryKeys";

export interface SendQuoteEmailRequest {
  quoteId: string;
  to: string;
  subject: string;
  message?: string;
  attachPdf?: boolean; // If true, attach PDF instead of using public link (backward compatibility)
}

export interface SendQuoteEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a quote email via Gmail integration
 */
export async function sendQuoteEmail(request: SendQuoteEmailRequest): Promise<SendQuoteEmailResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if Gmail is connected
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'gmail')
      .single();

    logger.debug('Gmail integration check:', {
      integrationError,
      integration: integration ? {
        id: integration.id,
        hasAccessToken: !!integration.access_token,
        expiresAt: integration.expires_at,
        email: integration.email
      } : null
    });

    if (integrationError || !integration?.access_token) {
      const error = new Error("Gmail not connected");
      error.name = 'EmailNotConnectedError';
      throw error;
    }

    // Generate public token for quote access (unless attachPdf is true)
    let tokenData = null;
    let publicUrl = null;
    
    logger.debug('Email sending request:', { 
      quoteId: request.quoteId, 
      recipientEmail: request.to,
      attachPdf: request.attachPdf 
    });
    
    if (!request.attachPdf) {
      logger.debug('Generating public token for quote:', { quoteId: request.quoteId, recipientEmail: request.to });
      try {
        tokenData = await generateToken({
          quoteId: request.quoteId,
          recipientEmail: request.to,
          expiresInDays: 30, // Default: 30 days
        });

        if (!tokenData || !tokenData.token) {
          logger.error('Token generation failed - no token returned:', { tokenData });
          throw new Error('Failed to generate token: No token returned');
        }

        // Generate public URL
        publicUrl = generatePublicUrl(tokenData.token);
        
        if (!publicUrl || publicUrl.trim() === '') {
          logger.error('Failed to generate public URL:', { token: tokenData.token, publicUrl });
          throw new Error('Failed to generate public URL: URL is empty');
        }
        
        // Validate URL format
        try {
          new URL(publicUrl);
        } catch (urlError) {
          logger.error('Invalid public URL format:', { publicUrl, error: urlError });
          throw new Error(`Invalid public URL format: ${publicUrl}`);
        }
        
        logger.debug('Generated public URL:', { url: publicUrl, tokenId: tokenData.id });
      } catch (error) {
        logger.error('Error generating token or URL:', error);
        // If token generation fails, fall back to PDF attachment
        logger.warn('Falling back to PDF attachment due to token generation error');
        // Don't throw - let it fall through to PDF attachment mode
      }
    } else {
      logger.debug('Using PDF attachment mode (legacy)');
    }

    // Generate idempotency key
    const idempotencyKey = `quote_email_${request.quoteId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Ensure attachPdf is a boolean (default: false)
    const attachPdf = request.attachPdf === true;

    // If we don't have a publicUrl and attachPdf is false, something went wrong
    // Fall back to PDF attachment mode
    const finalAttachPdf = attachPdf || !publicUrl;
    const finalPublicUrl = finalAttachPdf ? null : publicUrl;

    logger.debug('Sending email request to Netlify function:', {
      quoteId: request.quoteId,
      recipientEmail: request.to,
      hasPublicUrl: !!finalPublicUrl,
      publicUrl: finalPublicUrl,
      attachPdf: finalAttachPdf,
      originalAttachPdf: request.attachPdf
    });

    // Send email via Netlify Function
    const response = await fetch('/.netlify/functions/send-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        quote_id: request.quoteId,
        recipient_email: request.to,
        recipient_name: request.to.split('@')[0],
        subject: request.subject,
        message: request.message,
        public_url: finalPublicUrl, // Include public URL in email (null if attachPdf is true)
        token_id: tokenData?.id || null, // Include token ID for reference
        attach_pdf: finalAttachPdf, // Flag for backward compatibility (explicit boolean)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Extract detailed error message
      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      
      // If there are details with Google error, include them
      if (errorData.details?.googleError?.error_description) {
        errorMessage = `${errorMessage}: ${errorData.details.googleError.error_description}`;
      } else if (errorData.details?.googleError?.error) {
        errorMessage = `${errorMessage}: ${errorData.details.googleError.error}`;
      }
      
      // Log full error details
      logger.error('Send quote email error:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData,
        details: errorData.details,
        googleError: errorData.details?.googleError
      });
      
      // Create more detailed error
      const detailedError = new Error(errorMessage);
      (detailedError as any).details = errorData.details;
      (detailedError as any).errorData = errorData;
      throw detailedError;
    }

    const result = await response.json();





    if (result.success) {
      return {
        success: true,
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to send email');
    }

  } catch (error) {
    logger.error('Failed to send quote email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('Quote email error details:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      request: request
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check if Gmail integration is available
 */
export async function isGmailAvailable(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: gmailIntegration } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'gmail')
      .single();

    return !!gmailIntegration;
  } catch (error) {
    return false;
  }
}

/**
 * Get Gmail integration status
 */
export async function getGmailStatus(): Promise<{ connected: boolean; email?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { connected: false };

    const { data: gmailIntegration } = await supabase
      .from('user_integrations')
      .select('email')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'gmail')
      .single();

    if (!gmailIntegration) {
      return { connected: false };
    }

    return {
      connected: true,
      email: gmailIntegration.email
    };
  } catch (error) {
    return { connected: false };
  }
}

export function useSendQuoteEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendQuoteEmail,
    onMutate: async ({ quoteId }) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: qk.quote(quoteId) });
      await qc.cancelQueries({ queryKey: qk.quotes() });

      // Snapshot the previous value
      const previousQuote = qc.getQueryData(qk.quote(quoteId));

      // Optimistically update quote status to "sent"
      qc.setQueryData(qk.quote(quoteId), (old: any) => {
        if (!old) return old;
        return { ...old, status: "sent" };
      });

      // Optimistically update quotes list
      qc.setQueryData(qk.quotes(), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((quote: any) =>
            quote.id === quoteId ? { ...quote, status: "sent" } : quote
          )
        };
      });

      // Return context for rollback
      return { previousQuote };
    },
    onError: (_err, { quoteId }, context) => {
      // Rollback on error
      if (context?.previousQuote) {
        qc.setQueryData(qk.quote(quoteId), context.previousQuote);
      }
    },
    onSuccess: (_data, { quoteId }) => {
      // Invalidate to ensure consistency with server
      qc.invalidateQueries({ queryKey: qk.quote(quoteId) });
      qc.invalidateQueries({ queryKey: qk.quotes() });
      qc.invalidateQueries({ queryKey: qk.quoteStatusCounts() });
    }
  });
}

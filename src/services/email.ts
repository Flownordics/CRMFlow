import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// React hooks
import { useMutation } from "@tanstack/react-query";
import { logger } from '@/lib/logger';

export interface SendQuoteEmailRequest {
  quoteId: string;
  to: string;
  subject: string;
  message?: string;
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

    // Generate idempotency key
    const idempotencyKey = `quote_email_${request.quoteId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
  return useMutation({
    mutationFn: sendQuoteEmail,
  });
}

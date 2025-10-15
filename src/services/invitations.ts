/**
 * Invitation Service
 * 
 * Handles invitation creation, validation, and acceptance
 */

import { supabase } from '@/integrations/supabase/client';
import type { Invitation, CreateInvitationInput, ValidateInvitationResponse } from '@/types/invitation';
import { logger } from '@/lib/logger';

/**
 * Get all pending invitations (admin only)
 */
export async function getPendingInvitations(): Promise<Invitation[]> {
  try {
    const { data, error } = await supabase.rpc('get_pending_invitations');

    if (error) {
      logger.error('Error fetching pending invitations:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Failed to get pending invitations:', error);
    return [];
  }
}

/**
 * Create new invitation (admin only)
 */
export async function createInvitation(input: CreateInvitationInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_invitation', {
      p_email: input.email.toLowerCase(),
      p_role: input.role
    });

    if (error) {
      logger.error('Error creating invitation:', error);
      throw error;
    }

    return data as string;
  } catch (error) {
    logger.error('Failed to create invitation:', error);
    return null;
  }
}

/**
 * Revoke/delete invitation (admin only)
 */
export async function revokeInvitation(invitationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('revoke_invitation', {
      p_invitation_id: invitationId
    });

    if (error) {
      logger.error('Error revoking invitation:', error);
      throw error;
    }

    return data as boolean;
  } catch (error) {
    logger.error('Failed to revoke invitation:', error);
    return false;
  }
}

/**
 * Validate invitation token
 */
export async function validateInvitationToken(token: string): Promise<ValidateInvitationResponse> {
  try {
    const { data, error } = await supabase.rpc('validate_invitation_token', {
      p_token: token
    });

    if (error) {
      logger.error('Error validating invitation token:', error);
      return { is_valid: false, email: null, role: null };
    }

    const result = data?.[0];
    return {
      is_valid: result?.is_valid || false,
      email: result?.email || null,
      role: result?.role || null
    };
  } catch (error) {
    logger.error('Failed to validate invitation token:', error);
    return { is_valid: false, email: null, role: null };
  }
}

/**
 * Accept invitation (called after user signs up)
 */
export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token,
      p_user_id: userId
    });

    if (error) {
      logger.error('Error accepting invitation:', error);
      throw error;
    }

    return data as boolean;
  } catch (error) {
    logger.error('Failed to accept invitation:', error);
    return false;
  }
}

/**
 * Generate invitation URL with token
 */
export function getInvitationUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/signup?invitation=${token}`;
}

/**
 * Copy invitation URL to clipboard
 */
export async function copyInvitationUrl(token: string): Promise<boolean> {
  try {
    const url = getInvitationUrl(token);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    logger.error('Failed to copy invitation URL:', error);
    return false;
  }
}


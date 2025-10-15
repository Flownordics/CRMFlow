/**
 * Auth Service Extensions
 * 
 * Helper functions for authentication and sign-up validation
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/rbac';
import { logger } from '@/lib/logger';

export interface CanSignUpResponse {
  can_signup: boolean;
  reason: string;
  expected_role: UserRole | null;
}

/**
 * Check if an email can sign up
 * Returns whether the email is allowed to create an account
 * 
 * Allowed emails:
 * - @flownordics.com (auto-approved)
 * - Emails with valid invitations
 */
export async function canEmailSignUp(email: string): Promise<CanSignUpResponse> {
  try {
    const { data, error } = await supabase.rpc('can_email_signup', {
      p_email: email.toLowerCase()
    });

    if (error) {
      logger.error('Error checking email sign-up eligibility:', error);
      return {
        can_signup: false,
        reason: 'Unable to validate email. Please try again.',
        expected_role: null
      };
    }

    const result = data?.[0];
    return {
      can_signup: result?.can_signup || false,
      reason: result?.reason || 'Unknown error',
      expected_role: result?.expected_role || null
    };
  } catch (error) {
    logger.error('Failed to check email sign-up eligibility:', error);
    return {
      can_signup: false,
      reason: 'An error occurred. Please try again.',
      expected_role: null
    };
  }
}

/**
 * Validate if email is from allowed domain
 */
export function isFlownordicsEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === 'flownordics.com';
}

/**
 * Validate if email is Andreas (admin)
 */
export function isAndreasEmail(email: string): boolean {
  return email.toLowerCase() === 'andreas@flownordics.com';
}


/**
 * Invitation System Types
 * 
 * Types for invitation-based user onboarding with role assignment
 */

import type { UserRole } from './rbac';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  invited_by_name?: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
}

export interface ValidateInvitationResponse {
  is_valid: boolean;
  email: string | null;
  role: UserRole | null;
}

export interface InvitationFormData {
  email: string;
  role: UserRole;
}


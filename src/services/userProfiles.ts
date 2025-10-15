/**
 * User Profiles Service
 * 
 * Handles user profile CRUD operations for RBAC
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserProfile, UserRole } from '@/types/rbac';
import { logger } from '@/lib/logger';

export interface CreateUserProfileInput {
  user_id: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  department?: string;
}

export interface UpdateUserProfileInput {
  full_name?: string;
  avatar_url?: string;
  department?: string;
  is_active?: boolean;
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * Get all user profiles (for admin user management)
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching user profiles:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Failed to get user profiles:', error);
    return [];
  }
}

/**
 * Create user profile (admin only)
 */
export async function createUserProfile(
  input: CreateUserProfileInput
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: input.user_id,
        role: input.role,
        full_name: input.full_name || null,
        avatar_url: input.avatar_url || null,
        department: input.department || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to create user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(input)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to update user profile:', error);
    return null;
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to update user role:', error);
    return null;
  }
}

/**
 * Deactivate user (admin only)
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Failed to deactivate user:', error);
    return false;
  }
}

/**
 * Activate user (admin only)
 */
export async function activateUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: true })
      .eq('user_id', userId);

    if (error) {
      logger.error('Error activating user:', error);
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Failed to activate user:', error);
    return false;
  }
}

/**
 * Delete user profile (admin only)
 */
export async function deleteUserProfile(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting user profile:', error);
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Failed to delete user profile:', error);
    return false;
  }
}



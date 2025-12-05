import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { qk } from '@/lib/queryKeys';
import { z } from 'zod';
import type { UserRole } from '@/types/rbac';

// Schema for user with profile
export const UserWithProfileSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  role: z.preprocess(
    (val) => val ?? 'sales',
    z.enum(['admin', 'manager', 'sales', 'support', 'viewer'])
  ),
  is_active: z.preprocess(
    (val) => val ?? true,
    z.boolean()
  ),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
});

export type UserWithProfile = z.infer<typeof UserWithProfileSchema>;

/**
 * Fetch all users with their profile information (admin only)
 */
export async function fetchAllUsersWithProfiles(): Promise<UserWithProfile[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_users_with_profiles');

    if (error) {
      logger.error('Error fetching users with profiles:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return z.array(UserWithProfileSchema).parse(data || []);
  } catch (error) {
    logger.error('Error in fetchAllUsersWithProfiles:', error);
    throw error;
  }
}

/**
 * React Query hook to fetch all users with profiles
 */
export function useAllUsersWithProfiles() {
  return useQuery({
    queryKey: qk.usersWithProfiles(),
    queryFn: fetchAllUsersWithProfiles,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

/**
 * Update user profile (admin only)
 */
export interface UpdateUserProfilePayload {
  user_id: string;
  role?: UserRole;
  full_name?: string | null;
  is_active?: boolean;
  avatar_url?: string | null;
}

export async function updateUserProfileAdmin(
  payload: UpdateUserProfilePayload
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_profile_admin', {
      target_user_id: payload.user_id,
      new_role: payload.role || null,
      new_full_name: payload.full_name ?? null,
      new_is_active: payload.is_active ?? null,
      new_avatar_url: payload.avatar_url ?? null,
    });

    if (error) {
      logger.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in updateUserProfileAdmin:', error);
    throw error;
  }
}

/**
 * React Query mutation to update user profile
 */
export function useUpdateUserProfileAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfileAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.usersWithProfiles() });
      queryClient.invalidateQueries({ queryKey: qk.users() });
    },
  });
}

/**
 * Deactivate a user (admin only)
 */
export async function deactivateUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('deactivate_user', {
      target_user_id: userId,
    });

    if (error) {
      logger.error('Error deactivating user:', error);
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in deactivateUser:', error);
    throw error;
  }
}

/**
 * React Query mutation to deactivate user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.usersWithProfiles() });
      queryClient.invalidateQueries({ queryKey: qk.users() });
    },
  });
}

/**
 * Activate a user (admin only) - uses updateUserProfileAdmin
 */
export async function activateUser(userId: string): Promise<void> {
  return updateUserProfileAdmin({ user_id: userId, is_active: true });
}

/**
 * React Query mutation to activate user
 */
export function useActivateUser() {
  return useUpdateUserProfileAdmin();
}


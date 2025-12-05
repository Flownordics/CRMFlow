import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { qk } from '@/lib/queryKeys';
import type { UserProfile } from '@/types/rbac';

/**
 * Update own user profile (users can update their own name, etc.)
 */
export interface UpdateOwnProfilePayload {
  full_name?: string | null;
  avatar_url?: string | null;
}

export async function updateOwnProfile(
  payload: UpdateOwnProfilePayload
): Promise<UserProfile> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: payload.full_name ?? null,
        avatar_url: payload.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating own profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from profile update');
    }

    return data as UserProfile;
  } catch (error) {
    logger.error('Error in updateOwnProfile:', error);
    throw error;
  }
}

/**
 * React Query mutation to update own profile
 */
export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.userProfile() });
      queryClient.invalidateQueries({ queryKey: qk.users() });
    },
  });
}


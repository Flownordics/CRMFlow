import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import { z } from "zod";

// User schema based on user_settings joined with auth.users
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Fetch all system users (from auth.users via database function)
 * Uses get_all_users() function which returns all active users,
 * including those without user_settings entries
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    // Call the database function that returns all users
    const { data, error } = await supabase
      .rpc('get_all_users');

    if (error) {
      logger.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Map to User format - the function already returns the correct format
    const users: User[] = (data || [])
      .filter((u: any) => u.id && u.email) // Only include users with valid id and email
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
      }));

    return z.array(UserSchema).parse(users);
  } catch (error) {
    logger.error('Error in fetchUsers:', error);
    throw error;
  }
}

/**
 * React Query hook to fetch all system users
 */
export function useUsers() {
  return useQuery({
    queryKey: qk.users(),
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}


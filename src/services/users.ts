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
 * Fetch all system users (from user_settings)
 * Note: We can't directly query auth.users from client, so we use user_settings
 * which should have user_id, name, and email columns
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    // Fetch user_settings - this table should have user_id, name, and email
    const { data, error } = await supabase
      .from('user_settings')
      .select('user_id, name, email')
      .order('name', { ascending: true, nullsFirst: false });

    if (error) {
      logger.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Map to User format
    // Use email from user_settings, or fallback to constructing from name if email is missing
    const users: User[] = (data || [])
      .filter((us: any) => us.user_id) // Only include users with valid user_id
      .map((us: any) => {
        // Prioritize email from user_settings
        let email = us.email;
        // If email is missing, try to construct from name
        if (!email && us.name) {
          email = `${us.name.toLowerCase().replace(/\s+/g, '.')}@flownordics.com`;
        }
        // Last resort: generate email from user_id
        if (!email) {
          email = `user-${us.user_id.substring(0, 8)}@flownordics.com`;
        }
        
        // Prioritize name from user_settings, then extract from email
        let name = us.name;
        if (!name && us.email) {
          // Extract name from email (e.g., "andreas@flownordics.com" -> "Andreas")
          const emailName = us.email.split('@')[0];
          name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
        if (!name) {
          // Extract name from generated email
          const emailName = email.split('@')[0].replace('user-', '');
          name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
        
        return {
          id: us.user_id,
          email: email,
          name: name,
        };
      });

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


import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './analytics';
import { logger } from '@/lib/logger';

export interface SalespersonMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  
  // Revenue metrics
  totalRevenue: number;
  previousRevenue: number;
  revenueGrowth: number;
  
  // Deal metrics
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  winRate: number;
  averageDealSize: number;
  
  // Activity metrics
  totalActivities: number;
  callCount: number;
  emailCount: number;
  meetingCount: number;
  
  // Pipeline
  pipelineValue: number;
  
  // Efficiency
  activitiesToConversion: number;
}

export interface SalespersonComparison {
  metric: string;
  values: Record<string, number>;
}

// Hook to fetch salesperson analytics
export function useSalespersonAnalytics(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['salespersonAnalytics', dateRange],
    queryFn: async () => {
      try {
        logger.debug('[SalespersonAnalytics] Fetching data', { dateRange });
        
        // Fetch all relevant data
        const [dealsResult, invoicesResult, activitiesResult, usersResult] =
          await Promise.all([
            fetchDeals(dateRange),
            fetchInvoices(dateRange),
            fetchActivities(dateRange),
            fetchUsers(),
          ]);
        
        // Calculate metrics per salesperson
        const salespeople = calculateSalespersonMetrics(
          dealsResult,
          invoicesResult,
          activitiesResult,
          usersResult,
          dateRange
        );
        
        // Calculate comparisons
        const comparisons = calculateComparisons(salespeople);
        
        return {
          salespeople,
          comparisons,
        };
      } catch (error) {
        logger.error('[SalespersonAnalytics] Failed to calculate analytics', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

async function fetchDeals(dateRange?: DateRange) {
  let query = supabase
    .from('deals')
    .select('*')
    .not('deleted_at', 'is', null);
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchInvoices(dateRange?: DateRange) {
  let query = supabase
    .from('invoices')
    .select('*')
    .not('deleted_at', 'is', null);
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchActivities(dateRange?: DateRange) {
  let query = supabase.from('activity_log').select('*');
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchUsers() {
  // Get unique user IDs from deals and activities
  const { data: dealsUsers } = await supabase
    .from('deals')
    .select('owner_user_id')
    .not('owner_user_id', 'is', null);
  
  const { data: activityUsers } = await supabase
    .from('activity_log')
    .select('user_id')
    .not('user_id', 'is', null);
  
  const userIds = new Set([
    ...(dealsUsers?.map((d) => d.owner_user_id) || []),
    ...(activityUsers?.map((a) => a.user_id) || []),
  ]);
  
  if (userIds.size === 0) return [];
  
  // Fetch user profiles from user_settings table
  // Note: admin.listUsers() requires service role key, not available client-side
  try {
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('user_id, name, email')
      .in('user_id', Array.from(userIds));
    
    if (error) {
      console.warn('Failed to fetch user settings:', error);
      // Return placeholder data for users without settings
      return Array.from(userIds).map(id => ({
        id,
        email: 'User',
        name: 'User',
      }));
    }
    
    // Create a map of user settings
    const settingsMap = new Map(
      (userSettings || []).map(u => [u.user_id, u])
    );
    
    // Return all users, using settings where available, placeholders otherwise
    return Array.from(userIds).map(id => {
      const settings = settingsMap.get(id);
      return {
        id,
        email: settings?.email || 'User',
        name: settings?.name || settings?.email?.split('@')[0] || 'User',
      };
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    // Return placeholder data
    return Array.from(userIds).map(id => ({
      id,
      email: 'User',
      name: 'User',
    }));
  }
}

function calculateSalespersonMetrics(
  deals: any[],
  invoices: any[],
  activities: any[],
  users: any[],
  dateRange?: DateRange
): SalespersonMetrics[] {
  return users.map((user) => {
    // Filter data for this user
    const userDeals = deals.filter((d) => d.owner_user_id === user.id);
    const userActivities = activities.filter((a) => a.user_id === user.id);
    
    // Deal metrics
    const wonDeals = userDeals.filter((d) => d.status === 'won').length;
    const lostDeals = userDeals.filter((d) => d.status === 'lost').length;
    const openDeals = userDeals.filter(
      (d) => d.status !== 'won' && d.status !== 'lost'
    ).length;
    const totalDeals = wonDeals + lostDeals;
    const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
    
    // Revenue from paid invoices associated with this user's deals
    const dealIds = userDeals.map((d) => d.id);
    const userInvoices = invoices.filter(
      (i) => dealIds.includes(i.deal_id) && i.status === 'paid'
    );
    const totalRevenue = userInvoices.reduce(
      (sum, inv) => sum + (inv.total_minor || 0),
      0
    );
    
    // Previous period revenue for growth calculation
    let previousRevenue = 0;
    let revenueGrowth = 0;
    if (dateRange) {
      const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
      const previousStart = new Date(dateRange.start.getTime() - periodLength);
      const previousEnd = dateRange.start;
      
      const previousInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return (
          dealIds.includes(inv.deal_id) &&
          inv.status === 'paid' &&
          invDate >= previousStart &&
          invDate < previousEnd
        );
      });
      
      previousRevenue = previousInvoices.reduce(
        (sum, inv) => sum + (inv.total_minor || 0),
        0
      );
      
      if (previousRevenue > 0) {
        revenueGrowth =
          ((totalRevenue - previousRevenue) / previousRevenue) * 100;
      }
    }
    
    const averageDealSize = wonDeals > 0 ? totalRevenue / wonDeals : 0;
    
    // Pipeline value (open deals)
    const pipelineValue = userDeals
      .filter((d) => d.status !== 'won' && d.status !== 'lost')
      .reduce((sum, deal) => sum + (deal.expected_value_minor || 0), 0);
    
    // Activity metrics
    const totalActivities = userActivities.length;
    const callCount = userActivities.filter((a) => a.type === 'call').length;
    const emailCount = userActivities.filter((a) => a.type === 'email').length;
    const meetingCount = userActivities.filter(
      (a) => a.type === 'meeting'
    ).length;
    
    // Activities to conversion ratio
    const activitiesToConversion =
      wonDeals > 0 ? totalActivities / wonDeals : 0;
    
    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      totalRevenue,
      previousRevenue,
      revenueGrowth,
      totalDeals,
      wonDeals,
      lostDeals,
      openDeals,
      winRate,
      averageDealSize,
      totalActivities,
      callCount,
      emailCount,
      meetingCount,
      pipelineValue,
      activitiesToConversion,
    };
  });
}

function calculateComparisons(
  salespeople: SalespersonMetrics[]
): SalespersonComparison[] {
  const metrics = [
    'totalRevenue',
    'wonDeals',
    'winRate',
    'totalActivities',
    'pipelineValue',
  ];
  
  return metrics.map((metric) => {
    const values: Record<string, number> = {};
    
    salespeople.forEach((person) => {
      values[person.userName] =
        person[metric as keyof SalespersonMetrics] as number;
    });
    
    return {
      metric,
      values,
    };
  });
}


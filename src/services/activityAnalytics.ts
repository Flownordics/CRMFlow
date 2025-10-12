import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './analytics';
import { logger } from '@/lib/logger';

// Activity analytics types
export interface ActivityMetrics {
  totalActivities: number;
  callCount: number;
  emailCount: number;
  meetingCount: number;
  noteCount: number;
  taskCount: number;
  
  // Previous period comparison
  previousTotalActivities: number;
  activitiesGrowth: number;
  
  // Success rates
  callSuccessRate: number;
  emailSuccessRate: number;
  meetingSuccessRate: number;
  
  // Averages
  avgActivitiesPerDay: number;
  avgActivitiesPerCompany: number;
}

export interface ActivityTimelinePoint {
  date: string;
  call: number;
  email: number;
  meeting: number;
  note: number;
  task: number;
  total: number;
}

export interface ActivityDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface CallOutcome {
  outcome: string;
  count: number;
  percentage: number;
  isSuccess: boolean;
}

export interface ActivityByCompany {
  companyId: string;
  companyName: string;
  activityCount: number;
  lastActivityDate: string;
}

// Hook to fetch and calculate activity analytics
export function useActivityAnalytics(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['activityAnalytics', dateRange],
    queryFn: async () => {
      try {
        logger.debug('[ActivityAnalytics] Fetching activity data', { dateRange });
        
        // Build date filter
        let query = supabase
          .from('activity_log')
          .select('*');
        
        if (dateRange) {
          query = query
            .gte('created_at', dateRange.start.toISOString())
            .lte('created_at', dateRange.end.toISOString());
        }
        
        const { data: activities, error } = await query.order('created_at', { ascending: true });
        
        if (error) {
          logger.error('[ActivityAnalytics] Error fetching activities', error);
          throw error;
        }
        
        if (!activities || activities.length === 0) {
          return getEmptyAnalytics();
        }
        
        // Calculate metrics
        const metrics = calculateActivityMetrics(activities, dateRange);
        const timeline = calculateActivityTimeline(activities);
        const distribution = calculateActivityDistribution(activities);
        const callOutcomes = calculateCallOutcomes(activities);
        const topCompanies = await calculateTopCompanies(activities);
        
        return {
          metrics,
          timeline,
          distribution,
          callOutcomes,
          topCompanies,
        };
      } catch (error) {
        logger.error('[ActivityAnalytics] Failed to calculate analytics', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function getEmptyAnalytics() {
  return {
    metrics: {
      totalActivities: 0,
      callCount: 0,
      emailCount: 0,
      meetingCount: 0,
      noteCount: 0,
      taskCount: 0,
      previousTotalActivities: 0,
      activitiesGrowth: 0,
      callSuccessRate: 0,
      emailSuccessRate: 0,
      meetingSuccessRate: 0,
      avgActivitiesPerDay: 0,
      avgActivitiesPerCompany: 0,
    } as ActivityMetrics,
    timeline: [] as ActivityTimelinePoint[],
    distribution: [] as ActivityDistribution[],
    callOutcomes: [] as CallOutcome[],
    topCompanies: [] as ActivityByCompany[],
  };
}

function calculateActivityMetrics(
  activities: any[],
  dateRange?: DateRange
): ActivityMetrics {
  const totalActivities = activities.length;
  
  // Count by type
  const callCount = activities.filter((a) => a.type === 'call').length;
  const emailCount = activities.filter((a) => a.type === 'email').length;
  const meetingCount = activities.filter((a) => a.type === 'meeting').length;
  const noteCount = activities.filter((a) => a.type === 'note').length;
  const taskCount = activities.filter((a) => a.type === 'task').length;
  
  // Calculate previous period for growth
  let previousTotalActivities = 0;
  let activitiesGrowth = 0;
  
  if (dateRange) {
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodLength);
    const previousEnd = dateRange.start;
    
    previousTotalActivities = activities.filter((a) => {
      const actDate = new Date(a.created_at);
      return actDate >= previousStart && actDate < previousEnd;
    }).length;
    
    if (previousTotalActivities > 0) {
      activitiesGrowth =
        ((totalActivities - previousTotalActivities) / previousTotalActivities) *
        100;
    }
  }
  
  // Calculate success rates
  const successOutcomes = ['completed', 'voicemail', 'busy', 'scheduled_followup'];
  
  const successfulCalls = activities.filter(
    (a) => a.type === 'call' && a.outcome && successOutcomes.includes(a.outcome)
  ).length;
  const callSuccessRate = callCount > 0 ? (successfulCalls / callCount) * 100 : 0;
  
  const successfulEmails = activities.filter(
    (a) => a.type === 'email' && a.outcome && successOutcomes.includes(a.outcome)
  ).length;
  const emailSuccessRate =
    emailCount > 0 ? (successfulEmails / emailCount) * 100 : 0;
  
  const successfulMeetings = activities.filter(
    (a) => a.type === 'meeting' && a.outcome && successOutcomes.includes(a.outcome)
  ).length;
  const meetingSuccessRate =
    meetingCount > 0 ? (successfulMeetings / meetingCount) * 100 : 0;
  
  // Calculate averages
  let avgActivitiesPerDay = 0;
  if (dateRange) {
    const days =
      Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) /
          (1000 * 60 * 60 * 24)
      ) || 1;
    avgActivitiesPerDay = totalActivities / days;
  } else if (activities.length > 0) {
    const firstDate = new Date(activities[0].created_at);
    const lastDate = new Date(activities[activities.length - 1].created_at);
    const days =
      Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) ||
      1;
    avgActivitiesPerDay = totalActivities / days;
  }
  
  const uniqueCompanies = new Set(activities.map((a) => a.company_id)).size;
  const avgActivitiesPerCompany =
    uniqueCompanies > 0 ? totalActivities / uniqueCompanies : 0;
  
  return {
    totalActivities,
    callCount,
    emailCount,
    meetingCount,
    noteCount,
    taskCount,
    previousTotalActivities,
    activitiesGrowth,
    callSuccessRate,
    emailSuccessRate,
    meetingSuccessRate,
    avgActivitiesPerDay,
    avgActivitiesPerCompany,
  };
}

function calculateActivityTimeline(activities: any[]): ActivityTimelinePoint[] {
  // Group by date
  const byDate: Record<string, ActivityTimelinePoint> = {};
  
  activities.forEach((activity) => {
    const date = new Date(activity.created_at).toISOString().split('T')[0];
    
    if (!byDate[date]) {
      byDate[date] = {
        date,
        call: 0,
        email: 0,
        meeting: 0,
        note: 0,
        task: 0,
        total: 0,
      };
    }
    
    const type = activity.type.toLowerCase();
    if (type in byDate[date] && type !== 'date' && type !== 'total') {
      (byDate[date] as any)[type]++;
      byDate[date].total++;
    }
  });
  
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateActivityDistribution(
  activities: any[]
): ActivityDistribution[] {
  const typeCounts: Record<string, number> = {};
  
  activities.forEach((activity) => {
    const type = activity.type;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  const total = activities.length;
  
  return Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateCallOutcomes(activities: any[]): CallOutcome[] {
  const calls = activities.filter((a) => a.type === 'call' && a.outcome);
  
  if (calls.length === 0) return [];
  
  const outcomeCounts: Record<string, number> = {};
  
  calls.forEach((call) => {
    const outcome = call.outcome;
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
  });
  
  const successOutcomes = ['completed', 'voicemail', 'busy'];
  const total = calls.length;
  
  return Object.entries(outcomeCounts)
    .map(([outcome, count]) => ({
      outcome,
      count,
      percentage: (count / total) * 100,
      isSuccess: successOutcomes.includes(outcome),
    }))
    .sort((a, b) => b.count - a.count);
}

async function calculateTopCompanies(
  activities: any[]
): Promise<ActivityByCompany[]> {
  const companyActivities: Record<
    string,
    { count: number; lastDate: string }
  > = {};
  
  activities.forEach((activity) => {
    const companyId = activity.company_id;
    if (!companyId) return;
    
    if (!companyActivities[companyId]) {
      companyActivities[companyId] = {
        count: 0,
        lastDate: activity.created_at,
      };
    }
    
    companyActivities[companyId].count++;
    
    if (
      new Date(activity.created_at) >
      new Date(companyActivities[companyId].lastDate)
    ) {
      companyActivities[companyId].lastDate = activity.created_at;
    }
  });
  
  // Get company names
  const companyIds = Object.keys(companyActivities);
  if (companyIds.length === 0) return [];
  
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .in('id', companyIds);
  
  const companyMap = new Map(companies?.map((c) => [c.id, c.name]) || []);
  
  return Object.entries(companyActivities)
    .map(([companyId, data]) => ({
      companyId,
      companyName: companyMap.get(companyId) || 'Unknown',
      activityCount: data.count,
      lastActivityDate: data.lastDate,
    }))
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, 10);
}


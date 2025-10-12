import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Phone, Mail, Calendar, FileText, Handshake, Building2, User } from "lucide-react";
import { useCompanyActivityLogs } from "@/services/activityLog";
import { useDeals } from "@/services/deals";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'deal' | 'quote' | 'order' | 'invoice';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  entityType?: 'company' | 'deal' | 'quote' | 'invoice';
}

export function ActivityFeed() {
  const navigate = useNavigate();
  const { data: deals } = useDeals({ limit: 100 });
  const { getCompanyName } = useCompanyLookup();

  // For now, use deals as activity source (in future, combine with activity_log)
  const activities: ActivityItem[] = deals?.data?.slice(0, 10).map(deal => ({
    id: deal.id,
    type: 'deal',
    title: 'Deal Updated',
    description: `${deal.title} • ${getCompanyName(deal.company_id)}`,
    timestamp: deal.updated_at,
    entityId: deal.id,
    entityType: 'deal'
  })) || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'note': return FileText;
      case 'deal': return Handshake;
      case 'quote': return FileText;
      case 'order': return FileText;
      case 'invoice': return FileText;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'text-[#7a9db3]';
      case 'email': return 'text-[#9d94af]';
      case 'meeting': return 'text-[#6b7c5e]';
      case 'note': return 'text-[#9d855e]';
      case 'deal': return 'text-primary';
      case 'quote': return 'text-[#c89882]';
      case 'order': return 'text-[#7fa39b]';
      case 'invoice': return 'text-[#d4a574]';
      default: return 'text-muted-foreground';
    }
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.entityType && activity.entityId) {
      navigate(`/${activity.entityType}s/${activity.entityId}`);
    }
  };

  if (activities.length === 0) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest updates across your CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest updates across your CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const color = getActivityColor(activity.type);

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className={cn("p-2 rounded-full bg-background", color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{activity.title}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


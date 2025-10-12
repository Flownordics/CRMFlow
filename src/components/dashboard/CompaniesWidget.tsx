import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, AlertTriangle } from "lucide-react";
import { useCompanies } from "@/services/companies";
import { ActivityStatusBadge } from "@/components/companies/ActivityStatusBadge";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/money";

export function CompaniesWidget() {
  const navigate = useNavigate();
  const { data: companiesResponse, isLoading } = useCompanies({ limit: 1000 });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full mb-3" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const companies = companiesResponse?.data || [];

  // Recently contacted (green status, contacted within 3 days)
  const recentlyContacted = companies
    .filter(c => c.activityStatus === 'green' && c.lastActivityAt)
    .sort((a, b) => {
      if (!a.lastActivityAt) return 1;
      if (!b.lastActivityAt) return -1;
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    })
    .slice(0, 3);

  // Need attention (red/yellow status)
  const needAttention = companies
    .filter(c => c.activityStatus === 'red' || c.activityStatus === 'yellow')
    .sort((a, b) => {
      // Sort by activity status (red first, then yellow)
      if (a.activityStatus === 'red' && b.activityStatus !== 'red') return -1;
      if (a.activityStatus !== 'red' && b.activityStatus === 'red') return 1;
      
      // Then by last activity (oldest first)
      if (!a.lastActivityAt) return 1;
      if (!b.lastActivityAt) return -1;
      return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
    })
    .slice(0, 5);

  // New this week
  const sevenDaysAgo = subDays(new Date(), 7);
  const newThisWeek = companies
    .filter(c => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo)
    .length;

  return (
    <Card className="rounded-2xl border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Companies Activity
            </CardTitle>
            <CardDescription>
              {formatNumber(newThisWeek)} new this week • {formatNumber(needAttention.length)} need attention
            </CardDescription>
          </div>
          <Badge variant="outline">{formatNumber(companies.length)} total</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Need Attention Section */}
        {needAttention.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-[#9d855e]" />
              <span className="text-sm font-medium">Need Attention</span>
            </div>
            <div className="space-y-2">
              {needAttention.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ActivityStatusBadge 
                      status={company.activityStatus as any}
                      lastActivityAt={company.lastActivityAt}
                      showLabel={false}
                    />
                    <span className="text-sm font-medium truncate">{company.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {company.lastActivityAt 
                      ? formatDistanceToNow(new Date(company.lastActivityAt), { addSuffix: true })
                      : 'No activity'
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Contacted Section */}
        {recentlyContacted.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#6b7c5e]" />
              <span className="text-sm font-medium">Recently Contacted</span>
            </div>
            <div className="space-y-2">
              {recentlyContacted.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ActivityStatusBadge 
                      status={company.activityStatus as any}
                      lastActivityAt={company.lastActivityAt}
                      showLabel={false}
                    />
                    <span className="text-sm font-medium truncate">{company.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {company.lastActivityAt 
                      ? formatDistanceToNow(new Date(company.lastActivityAt), { addSuffix: true })
                      : ''
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


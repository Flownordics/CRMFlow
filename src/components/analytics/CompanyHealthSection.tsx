import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { chartColors, chartTheme } from './charts/chartConfig';
import { formatPercentage } from '@/services/analytics';

interface CompanyHealthData {
  greenCount: number;
  yellowCount: number;
  redCount: number;
  avgDaysSinceContact: number;
  atRiskCompanies: Array<{
    id: string;
    name: string;
    daysSinceContact: number;
  }>;
}

export function CompanyHealthSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['companyHealth'],
    queryFn: async () => {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, activity_status, last_activity_at')
        .is('deleted_at', null);

      if (error) throw error;

      const greenCount = companies?.filter((c) => c.activity_status === 'green').length || 0;
      const yellowCount = companies?.filter((c) => c.activity_status === 'yellow').length || 0;
      const redCount = companies?.filter((c) => c.activity_status === 'red').length || 0;

      // Calculate average days since last contact
      const now = new Date();
      let totalDays = 0;
      let companiesWithActivity = 0;

      companies?.forEach((company) => {
        if (company.last_activity_at) {
          const lastActivity = new Date(company.last_activity_at);
          const daysDiff = Math.floor(
            (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
          );
          totalDays += daysDiff;
          companiesWithActivity++;
        }
      });

      const avgDaysSinceContact = companiesWithActivity > 0
        ? Math.round(totalDays / companiesWithActivity)
        : 0;

      // Get top 5 at-risk companies
      const atRiskCompanies = companies
        ?.filter((c) => c.activity_status === 'red' && c.last_activity_at)
        .map((c) => {
          const lastActivity = new Date(c.last_activity_at!);
          const daysSinceContact = Math.floor(
            (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            id: c.id,
            name: c.name,
            daysSinceContact,
          };
        })
        .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
        .slice(0, 5) || [];

      return {
        greenCount,
        yellowCount,
        redCount,
        avgDaysSinceContact,
        atRiskCompanies,
      } as CompanyHealthData;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Health Dashboard</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = data.greenCount + data.yellowCount + data.redCount;
  const chartData = [
    { name: 'Active (≤90 days)', value: data.greenCount, color: chartColors.green },
    { name: 'Moderate (91-180 days)', value: data.yellowCount, color: chartColors.yellow },
    { name: 'At Risk (>180 days)', value: data.redCount, color: chartColors.red },
  ].filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">Companies:</span> {data.value}
          </p>
          <p className="text-sm">
            <span className="font-medium">Percentage:</span>{' '}
            {formatPercentage((data.value / total) * 100)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#6b7c5e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#6b7c5e]">{data.greenCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage((data.greenCount / total) * 100)} of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-[#b8695f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#b8695f]">{data.redCount}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days Since Contact</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgDaysSinceContact}</div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Status Distribution</CardTitle>
            <CardDescription>
              Company engagement levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={chartTheme.legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* At-Risk Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#b8695f]" />
              Top At-Risk Companies
            </CardTitle>
            <CardDescription>
              Companies needing immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.atRiskCompanies.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No at-risk companies found
              </div>
            ) : (
              <div className="space-y-3">
                {data.atRiskCompanies.map((company, index) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {company.daysSinceContact} days since last contact
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


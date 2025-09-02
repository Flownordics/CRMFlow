import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Handshake,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

const metricCards = [
  {
    title: "Total Revenue",
    value: "$127,450",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    color: "text-success",
  },
  {
    title: "Active Deals",
    value: "23",
    change: "+3",
    trend: "up",
    icon: Handshake,
    color: "text-primary",
  },
  {
    title: "Companies",
    value: "156",
    change: "+8",
    trend: "up",
    icon: Building2,
    color: "text-accent",
  },
  {
    title: "Contacts",
    value: "432",
    change: "+12",
    trend: "up",
    icon: Users,
    color: "text-muted-foreground",
  },
];

const recentDeals = [
  {
    id: 1,
    company: "Tech Corp",
    value: "$15,000",
    stage: "Negotiation",
    probability: 75,
  },
  {
    id: 2,
    company: "Design Studio",
    value: "$8,500",
    stage: "Proposal",
    probability: 60,
  },
  {
    id: 3,
    company: "Marketing Inc",
    value: "$22,000",
    stage: "Closing",
    probability: 90,
  },
  {
    id: 4,
    company: "Finance Pro",
    value: "$12,300",
    stage: "Discovery",
    probability: 30,
  },
];

const upcomingTasks = [
  { id: 1, title: "Follow up with Tech Corp", due: "Today", priority: "high" },
  {
    id: 2,
    title: "Send proposal to Design Studio",
    due: "Tomorrow",
    priority: "medium",
  },
  { id: 3, title: "Call Marketing Inc", due: "Dec 28", priority: "high" },
  { id: 4, title: "Update CRM data", due: "Dec 30", priority: "low" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Welcome Header */}
      <PageHeader
        title="Welcome back, John"
        actions={
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Calendar aria-hidden="true" className="mr-2 h-4 w-4" />
              This Month
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
              New Deal
            </Button>
          </div>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, index) => (
          <Card
            key={index}
            className="ease-out-soft rounded-2xl border shadow-card transition-shadow duration-base hover:shadow-hover"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon
                aria-hidden="true"
                className={cn("h-4 w-4", metric.color)}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metric.value}
              </div>
              <div className="mt-1 flex items-center text-xs text-muted-foreground">
                {metric.trend === "up" ? (
                  <ArrowUp
                    aria-hidden="true"
                    className="mr-1 h-3 w-3 text-success"
                  />
                ) : (
                  <ArrowDown
                    aria-hidden="true"
                    className="mr-1 h-3 w-3 text-destructive"
                  />
                )}
                <span
                  className={cn(
                    metric.trend === "up" ? "text-success" : "text-destructive",
                  )}
                >
                  {metric.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity and Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Deals */}
        <Card className="rounded-2xl border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake aria-hidden="true" className="h-5 w-5" />
              Recent Deals
            </CardTitle>
            <CardDescription>Latest sales opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div>
                  <div className="text-sm font-medium">{deal.company}</div>
                  <div className="text-xs text-muted-foreground">
                    {deal.stage}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{deal.value}</div>
                  <Badge variant="outline" className="text-xs">
                    {deal.probability}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="rounded-2xl border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar aria-hidden="true" className="h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
            <CardDescription>Things to do this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Due: {task.due}
                  </div>
                </div>
                <Badge
                  variant={
                    task.priority === "high"
                      ? "destructive"
                      : task.priority === "medium"
                        ? "default"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {task.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Plus aria-hidden="true" className="h-6 w-6" />
              <span className="text-sm">New Deal</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Building2 aria-hidden="true" className="h-6 w-6" />
              <span className="text-sm">Add Company</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users aria-hidden="true" className="h-6 w-6" />
              <span className="text-sm">Add Contact</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FileText aria-hidden="true" className="h-6 w-6" />
              <span className="text-sm">Create Quote</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

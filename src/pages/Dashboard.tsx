import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Building2, Users, Handshake, TrendingUp, 
  DollarSign, Calendar, FileText, AlertCircle,
  ArrowUp, ArrowDown, Plus
} from "lucide-react"

const metricCards = [
  {
    title: "Total Revenue",
    value: "$127,450",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    color: "text-success"
  },
  {
    title: "Active Deals",
    value: "23",
    change: "+3",
    trend: "up", 
    icon: Handshake,
    color: "text-primary"
  },
  {
    title: "Companies",
    value: "156",
    change: "+8",
    trend: "up",
    icon: Building2,
    color: "text-accent"
  },
  {
    title: "Contacts",
    value: "432",
    change: "+12",
    trend: "up",
    icon: Users,
    color: "text-muted-foreground"
  }
]

const recentDeals = [
  { id: 1, company: "Tech Corp", value: "$15,000", stage: "Negotiation", probability: 75 },
  { id: 2, company: "Design Studio", value: "$8,500", stage: "Proposal", probability: 60 },
  { id: 3, company: "Marketing Inc", value: "$22,000", stage: "Closing", probability: 90 },
  { id: 4, company: "Finance Pro", value: "$12,300", stage: "Discovery", probability: 30 }
]

const upcomingTasks = [
  { id: 1, title: "Follow up with Tech Corp", due: "Today", priority: "high" },
  { id: 2, title: "Send proposal to Design Studio", due: "Tomorrow", priority: "medium" },
  { id: 3, title: "Call Marketing Inc", due: "Dec 28", priority: "high" },
  { id: 4, title: "Update CRM data", due: "Dec 30", priority: "low" }
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, John</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your sales today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            This Month
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {metric.trend === "up" ? (
                  <ArrowUp className="w-3 h-3 text-success mr-1" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-destructive mr-1" />
                )}
                <span className={metric.trend === "up" ? "text-success" : "text-destructive"}>
                  {metric.change}
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Recent Deals</CardTitle>
                <CardDescription>Latest opportunities in your pipeline</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{deal.company}</p>
                        <p className="text-xs text-muted-foreground">{deal.stage}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{deal.value}</p>
                    <Badge variant="secondary" className="text-xs">
                      {deal.probability}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
                <CardDescription>Don't miss these important follow-ups</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-destructive' : 
                    task.priority === 'medium' ? 'bg-warning' : 'bg-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.due}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      task.priority === 'high' ? 'border-destructive text-destructive' :
                      task.priority === 'medium' ? 'border-warning text-warning' : 
                      'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
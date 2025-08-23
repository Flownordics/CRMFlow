import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Plus, Building2, User, DollarSign, Calendar,
  MoreHorizontal, Search, Filter
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

const stages = [
  { id: "prospecting", name: "Prospecting", color: "bg-muted" },
  { id: "qualified", name: "Qualified", color: "bg-warning" },
  { id: "proposal", name: "Proposal", color: "bg-primary" },
  { id: "negotiation", name: "Negotiation", color: "bg-accent" },
  { id: "closed-won", name: "Closed Won", color: "bg-success" },
]

const deals = [
  {
    id: 1,
    title: "Enterprise Software License",
    company: "Tech Corp Solutions",
    value: 15000,
    probability: 75,
    stage: "negotiation",
    owner: "John Doe",
    closeDate: "2024-01-15",
    lastActivity: "2 days ago"
  },
  {
    id: 2,
    title: "Website Redesign Project",
    company: "Design Studio Pro",
    value: 8500,
    probability: 60,
    stage: "proposal",
    owner: "Jane Smith",
    closeDate: "2024-01-20",
    lastActivity: "1 week ago"
  },
  {
    id: 3,
    title: "Marketing Campaign",
    company: "Marketing Masters",
    value: 22000,
    probability: 90,
    stage: "closed-won",
    owner: "Mike Johnson",
    closeDate: "2024-01-10",
    lastActivity: "3 days ago"
  },
  {
    id: 4,
    title: "Financial Consulting",
    company: "Finance First LLC",
    value: 12300,
    probability: 30,
    stage: "qualified",
    owner: "Sarah Wilson",
    closeDate: "2024-02-01",
    lastActivity: "1 day ago"
  },
  {
    id: 5,
    title: "Cloud Migration",
    company: "Tech Corp Solutions",
    value: 35000,
    probability: 45,
    stage: "prospecting",
    owner: "John Doe",
    closeDate: "2024-02-15",
    lastActivity: "5 days ago"
  }
]

const probabilityColors = {
  high: "text-success",
  medium: "text-warning", 
  low: "text-muted-foreground"
}

const getProbabilityLevel = (prob: number) => {
  if (prob >= 70) return "high"
  if (prob >= 40) return "medium"
  return "low"
}

export default function Deals() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDeals = deals.filter(deal =>
    deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDealsByStage = (stageId: string) => {
    return filteredDeals.filter(deal => deal.stage === stageId)
  }

  const getTotalValue = (stageId: string) => {
    return getDealsByStage(stageId).reduce((sum, deal) => sum + deal.value, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deals Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track and manage your sales opportunities</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search deals and companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-x-auto">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id)
          const totalValue = getTotalValue(stage.id)
          
          return (
            <div key={stage.id} className="min-w-[300px]">
              <Card className="border-0 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    ${totalValue.toLocaleString()} total value
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id} className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm line-clamp-2">{deal.title}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit Deal</DropdownMenuItem>
                                <DropdownMenuItem>Move Stage</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{deal.company}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-lg font-semibold text-foreground">
                              ${deal.value.toLocaleString()}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${probabilityColors[getProbabilityLevel(deal.probability)]}`}
                            >
                              {deal.probability}%
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{deal.owner}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(deal.closeDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Last activity: {deal.lastActivity}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {stageDeals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No deals in this stage
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
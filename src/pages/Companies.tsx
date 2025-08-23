import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Search, Plus, Filter, MoreHorizontal, 
  Building2, Users, DollarSign, Calendar,
  Phone, Mail, MapPin
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const companies = [
  {
    id: 1,
    name: "Tech Corp Solutions",
    industry: "Technology",
    employees: "250-500",
    revenue: "$2.5M",
    location: "San Francisco, CA",
    status: "Active",
    lastContact: "2 days ago",
    contacts: 5,
    deals: 3,
    logo: "/api/placeholder/40/40"
  },
  {
    id: 2,
    name: "Design Studio Pro",
    industry: "Design",
    employees: "10-50",
    revenue: "$500K",
    location: "New York, NY",
    status: "Prospecting",
    lastContact: "1 week ago",
    contacts: 2,
    deals: 1,
    logo: "/api/placeholder/40/40"
  },
  {
    id: 3,
    name: "Marketing Masters",
    industry: "Marketing",
    employees: "50-100",
    revenue: "$1.2M",
    location: "Austin, TX",
    status: "Active",
    lastContact: "3 days ago",
    contacts: 8,
    deals: 2,
    logo: "/api/placeholder/40/40"
  },
  {
    id: 4,
    name: "Finance First LLC",
    industry: "Finance",
    employees: "100-250",
    revenue: "$3.8M",
    location: "Chicago, IL",
    status: "Negotiating",
    lastContact: "1 day ago",
    contacts: 4,
    deals: 5,
    logo: "/api/placeholder/40/40"
  }
]

const statusColors = {
  "Active": "bg-success text-success-foreground",
  "Prospecting": "bg-warning text-warning-foreground",
  "Negotiating": "bg-primary text-primary-foreground",
  "Closed": "bg-muted text-muted-foreground"
}

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage your company relationships and deals</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search companies, industries, locations..."
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

      {/* Companies Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Directory
          </CardTitle>
          <CardDescription>
            {filteredCompanies.length} companies found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Metrics</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={company.logo} alt={company.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {company.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{company.name}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {company.location}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {company.industry}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{company.employees}</TableCell>
                  <TableCell className="font-medium text-sm">{company.revenue}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[company.status as keyof typeof statusColors]}`}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {company.lastContact}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {company.contacts}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {company.deals}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Company</DropdownMenuItem>
                        <DropdownMenuItem>Add Contact</DropdownMenuItem>
                        <DropdownMenuItem>Create Deal</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
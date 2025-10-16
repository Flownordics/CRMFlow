import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePeople } from "@/services/people";
import { useCompanies } from "@/services/companies";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { PersonModal } from "@/components/people/PersonModal";
import { Person } from "@/lib/schemas/person";
import { useI18n } from "@/lib/i18n";
import { z } from "zod";
import { Plus, ChevronLeft, ChevronRight, Search, Grid3X3, List } from "lucide-react";
import { PeopleKpiHeader } from "@/components/people/PeopleKpiHeader";
import { PeopleFilters } from "@/components/people/PeopleFilters";
import { PersonCard } from "@/components/people/PersonCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalyticsCard, AnalyticsCardGrid } from "@/components/common/charts/AnalyticsCard";
import { RoleDistributionChart } from "@/components/people/RoleDistributionChart";
import { ContactGrowthChart } from "@/components/people/ContactGrowthChart";
import { PieChart as PieChartIcon, TrendingUp as TrendingUpIcon } from "lucide-react";
import { getRoleColor } from "@/lib/chartUtils";

export default function PeopleList() {
    const { t } = useI18n();
    const { data: companiesResponse } = useCompanies();
    const [companyId, setCompanyId] = useState<string>("all");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [title, setTitle] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<any | undefined>();
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const [filters, setFilters] = useState({
        hasEmail: false,
        hasPhone: false,
        role: null as string | null,
    });
    const navigate = useNavigate();

    const { data: peopleResponse, isLoading, error } = usePeople({
        page,
        limit,
        q,
        companyId: companyId === "all" ? undefined : companyId,
        title: title === "all" ? undefined : title
    });

    if (isLoading) {
        return (
            <div className="p-6">
                <Skeleton className="h-6 w-64" />
            </div>
        );
    }

    if (error) {
        return (
            <div role="alert" className="p-6 text-destructive">
                Failed to load people
            </div>
        );
    }

    const people = peopleResponse?.data || [];
    const total = peopleResponse?.total || 0;
    const totalPages = peopleResponse?.totalPages || 1;

    // Calculate KPI metrics
    const withEmail = people.filter(p => p.email).length;
    const withPhone = people.filter(p => p.phone).length;
    const newThisMonth = people.filter(p => {
        const createdAt = new Date(p.created_at);
        const now = new Date();
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length;

    const openEdit = (personId: string) => {
        const person = people?.find(p => p.id === personId);
        setEditingPerson(person);
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingPerson(undefined);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingPerson(undefined);
    };

    const handleModalSuccess = () => {
        // The modal will close and the list will refresh via React Query invalidation
    };

    const handleSearch = (searchTerm: string) => {
        setQ(searchTerm);
        setPage(1); // Reset to first page on search
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleFilterChange = (filter: keyof typeof filters, value: boolean | string | null) => {
        setFilters(prev => ({ ...prev, [filter]: value }));
        setPage(1); // Reset to first page on filter change
    };

    const filteredPeople = people.filter(person => {
        if (filters.hasEmail && !person.email) return false;
        if (filters.hasPhone && !person.phone) return false;
        if (filters.role && person.title && !person.title.toLowerCase().includes(filters.role.toLowerCase())) return false;
        return true;
    });

    const columns = [
        {
            header: "Name",
            accessorKey: "firstName",
            cell: (r: any) => {
                const roleColor = getRoleColor(r.title);
                const initials = (r.first_name?.[0] || "") + (r.last_name?.[0] || "");
                return (
                    <div className="flex items-center gap-3">
                        <Avatar 
                            className="h-8 w-8 ring-2" 
                            style={{ borderColor: roleColor }}
                        >
                            <AvatarFallback 
                                style={{ 
                                    backgroundColor: `${roleColor}20`,
                                    color: roleColor
                                }}
                            >
                                {initials || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="font-medium truncate">
                                    <Link
                                        to={`/people/${r.id}`}
                                        className="text-foreground hover:underline focus:outline-none focus-visible:ring-2 rounded-sm"
                                        aria-label={`Open ${r.first_name} ${r.last_name}`}
                                    >
                                        {r.first_name} {r.last_name}
                                    </Link>
                                </div>
                                {r.title && (
                                    <span 
                                        className="text-xs rounded-full px-2 py-0.5"
                                        style={{ 
                                            backgroundColor: `${roleColor}20`,
                                            color: roleColor
                                        }}
                                    >
                                        {r.title}
                                    </span>
                                )}
                            </div>
                            {r.company_id && companiesResponse?.data?.find((c: any) => c.id === r.company_id) && (
                                <div className="text-xs text-muted-foreground truncate">
                                    <a className="hover:underline" href={`/companies/${r.company_id}`}>
                                        {companiesResponse.data.find((c: any) => c.id === r.company_id)?.name}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
            meta: { sortable: true }
        },
        {
            header: "Contact",
            accessorKey: "email",
            cell: (r: any) => (
                <div className="space-y-2">
                    {r.email ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                            <Mail className="h-3 w-3" aria-hidden="true" />
                            {r.email}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {r.phone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                            <Phone className="h-3 w-3" aria-hidden="true" />
                            {r.phone}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </div>
            ),
            meta: { sortable: true }
        },
        {
            header: "Actions",
            cell: (r: any) => <Button variant="ghost" size="sm" onClick={() => openEdit(r.id)}>Edit</Button>,
            meta: { align: "end" as const }
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                title="People"
                subtitle="Your contacts across companies—fast communication, clean overview."
                actions={<Button onClick={() => openCreate()}>Add Person</Button>}
            />
            <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />

            {/* KPI Header */}
            <PeopleKpiHeader
                total={total}
                withEmail={withEmail}
                withPhone={withPhone}
                newThisMonth={newThisMonth}
            />

            {/* Analytics Charts */}
            {people.length > 0 && (
                <AnalyticsCardGrid columns={2}>
                    <AnalyticsCard
                        title="Role Distribution"
                        description="People by role/title"
                        icon={PieChartIcon}
                        chartName="Role Distribution"
                    >
                        <RoleDistributionChart people={people} />
                    </AnalyticsCard>

                    <AnalyticsCard
                        title="Contact Growth"
                        description="Total contacts over time"
                        icon={TrendingUpIcon}
                        chartName="Contact Growth"
                    >
                        <ContactGrowthChart people={people} />
                    </AnalyticsCard>
                </AnalyticsCardGrid>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex max-w-md gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                            <Input
                                placeholder="Search people…"
                                value={q}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("table")}
                            className="h-8 w-8 p-0"
                            aria-label="Table view"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className="h-8 w-8 p-0"
                            aria-label="Grid view"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <Select value={companyId} onValueChange={setCompanyId}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Filter by company" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All companies</SelectItem>
                            {(companiesResponse?.data ?? []).map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={title} onValueChange={setTitle}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by title" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All titles</SelectItem>
                            <SelectItem value="CEO">CEO</SelectItem>
                            <SelectItem value="CTO">CTO</SelectItem>
                            <SelectItem value="CFO">CFO</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Developer">Developer</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Quick Filters */}
                <PeopleFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>

            {/* People View */}
            {viewMode === "table" ? (
                <DataTable columns={columns} data={filteredPeople} pageSize={limit} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPeople.map((person) => (
                        <PersonCard
                            key={person.id}
                            person={person}
                            onClick={() => navigate(`/people/${person.id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, filteredPeople.length)} of {filteredPeople.length} people
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Person Modal */}
            <PersonModal
                person={editingPerson}
                open={isModalOpen}
                onOpenChange={handleModalClose}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}

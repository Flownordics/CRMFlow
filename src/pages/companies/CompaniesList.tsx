import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/services/companies";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { CompanyModal } from "@/components/companies/CompanyModal";
import { Company } from "@/lib/schemas/company";
import { ChevronLeft, ChevronRight, Search, Grid3X3, List, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEBUG_UI } from "@/lib/debug";
import { CompaniesKpiHeader } from "@/components/companies/CompaniesKpiHeader";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { cn } from "@/lib/utils";
import { getIndustryTheme, industryTokenText } from "@/components/companies/industryTheme";
import { ActivityStatusBadge } from "@/components/companies/ActivityStatusBadge";
import { ActivityStatus } from "@/lib/schemas/callList";

export default function CompaniesList() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [industry, setIndustry] = useState<string>("all");
    const [country, setCountry] = useState<string>("all");
    const [activityStatus, setActivityStatus] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | undefined>();
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const navigate = useNavigate();

    const { data: companiesResponse, isLoading, error } = useCompanies({
        page,
        limit,
        q,
        industry: industry === "all" ? undefined : industry,
        country: country === "all" ? undefined : country
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
                Failed to load companies
            </div>
        );
    }

    const companies = companiesResponse?.data || [];
    const total = companiesResponse?.total || 0;
    const totalPages = companiesResponse?.totalPages || 1;

    const openEdit = (companyId: string) => {
        const company = companies?.find(c => c.id === companyId);
        setEditingCompany(company);
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingCompany(undefined);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingCompany(undefined);
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

    const columns = [
        {
            header: "Status",
            accessorKey: "activityStatus",
            cell: (r: any) => (
                <ActivityStatusBadge
                    status={r.activityStatus as ActivityStatus}
                    lastActivityAt={r.lastActivityAt}
                />
            ),
        },
        {
            header: "Company",
            accessorKey: "name",
            cell: (r: any) => {
                const theme = getIndustryTheme(r.industry);
                const Icon = theme.icon;
                return (
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", industryTokenText(theme.color))} aria-hidden="true" />
                        <a className="font-medium hover:underline" href={`/companies/${r.id}`}>
                            {r.name}
                        </a>
                    </div>
                );
            },
            meta: { sortable: true }
        },
        {
            header: "Industry",
            accessorKey: "industry",
            cell: (r: any) => r.industry ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/10 text-muted-foreground text-xs">
                    {r.industry}
                </span>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
            meta: { sortable: true }
        },
        {
            header: "Website",
            accessorKey: "website",
            cell: (r: any) => r.website ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs">
                    {r.website}
                </span>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
            meta: { sortable: true }
        },

        {
            header: "Country",
            accessorKey: "country",
            cell: (r: any) => r.country ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    {r.country}
                </span>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
            meta: { sortable: true }
        },
        {
            header: "Location",
            accessorKey: "city",
            cell: (r: any) => [r.city, r.country].filter(Boolean).join(", ") || (
                <span className="text-muted-foreground">—</span>
            ),
            meta: { sortable: true }
        },
        {
            header: "Updated",
            accessorKey: "updatedAt",
            cell: (r: any) => new Date(r.updatedAt).toLocaleDateString(),
            meta: { sortable: true }
        },
        {
            header: "",
            cell: (r: any) => <Button variant="ghost" size="sm" onClick={() => openEdit(r.id)}>Edit</Button>,
            meta: { align: "end" }
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                title="Companies"
                subtitle="Organize your accounts and manage relationships."
                actions={<Button onClick={() => openCreate()}>Add Company</Button>}
            />

            {/* Gradient separator */}
            <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />

            {/* KPI Header */}
            <CompaniesKpiHeader companies={companies} />

            {/* Debug UI */}
            {DEBUG_UI && error && (
                <div className="rounded-xl border bg-muted/20 p-3 text-xs" role="alert">
                    <div><b>/companies error:</b> {(error as any)?.message}</div>
                    <div className="text-muted-foreground">Tip: Åbn Network ⇨ klik /companies ⇨ læs Status, Content-Type og første linjer af Response.</div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex max-w-md gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                            <Input
                                placeholder="Search companies…"
                                value={q}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant={viewMode === "table" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("table")}
                        >
                            <List className="h-4 w-4 mr-2" />
                            Table
                        </Button>
                        <Button
                            variant={viewMode === "grid" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid3X3 className="h-4 w-4 mr-2" />
                            Grid
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <Select value={activityStatus} onValueChange={setActivityStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Aktivitetsstatus" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle statusser</SelectItem>
                            <SelectItem value="green">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Grøn (≤3 mdr)
                                </div>
                            </SelectItem>
                            <SelectItem value="yellow">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Gul (3-6 mdr)
                                </div>
                            </SelectItem>
                            <SelectItem value="red">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Rød ({'>'}6 mdr)
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Industry" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All industries</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All countries</SelectItem>
                            <SelectItem value="DK">Denmark</SelectItem>
                            <SelectItem value="SE">Sweden</SelectItem>
                            <SelectItem value="NO">Norway</SelectItem>
                            <SelectItem value="DE">Germany</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Companies View */}
            {viewMode === "table" ? (
                <DataTable columns={columns} data={companies} pageSize={limit} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {companies.map((company) => (
                        <CompanyCard
                            key={company.id}
                            company={company}
                            onClick={() => navigate(`/companies/${company.id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-muted/20 rounded-xl p-4 border">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} companies
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
                            <div className="text-sm font-medium px-3 py-1 bg-background rounded-md border">
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
                </div>
            )}

            {/* Company Modal */}
            <CompanyModal
                company={editingCompany}
                open={isModalOpen}
                onOpenChange={handleModalClose}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}

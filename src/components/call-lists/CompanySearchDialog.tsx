import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompanies } from "@/services/companies";
import { useAddCompaniesToCallList } from "@/services/callLists";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompanySearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    callListId: string;
    existingCompanyIds?: string[];
}

export function CompanySearchDialog({
    open,
    onOpenChange,
    callListId,
    existingCompanyIds = [],
}: CompanySearchDialogProps) {
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const { data: companiesResponse, isLoading } = useCompanies({
        page: 1,
        limit: 50,
        q: debouncedSearch,
    });

    const addMutation = useAddCompaniesToCallList(callListId);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const companies = companiesResponse?.data || [];
    const availableCompanies = companies.filter(
        (c) => !existingCompanyIds.includes(c.id)
    );

    const toggleCompany = (companyId: string) => {
        setSelectedIds((prev) =>
            prev.includes(companyId)
                ? prev.filter((id) => id !== companyId)
                : [...prev, companyId]
        );
    };

    const handleAdd = async () => {
        if (selectedIds.length === 0) {
            toast({
                title: "No Companies Selected",
                description: "Please select at least one company",
                variant: "destructive",
            });
            return;
        }

        try {
            const count = await addMutation.mutateAsync(selectedIds);

            toast({
                title: "Success",
                description: `Added ${count} ${count === 1 ? 'company' : 'companies'} to call list`,
            });

            setSelectedIds([]);
            setSearch("");
            onOpenChange(false);
        } catch (error: any) {
            if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
                toast({
                    title: "Duplicate Entries",
                    description: "Some companies are already in this call list",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: error?.message || "Failed to add companies",
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Companies to Call List</DialogTitle>
                    <DialogDescription>
                        Search and select companies to add to this call list
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search companies..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <ScrollArea className="h-[400px] rounded-md border p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : availableCompanies.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {search
                                    ? "No companies found matching your search"
                                    : existingCompanyIds.length > 0
                                    ? "All companies are already in this call list"
                                    : "No companies available"}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {availableCompanies.map((company) => (
                                    <div
                                        key={company.id}
                                        className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                                        onClick={() => toggleCompany(company.id)}
                                    >
                                        <Checkbox
                                            checked={selectedIds.includes(company.id)}
                                            onCheckedChange={() => toggleCompany(company.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">{company.name}</div>
                                            {company.phone && (
                                                <div className="text-sm text-muted-foreground">
                                                    {company.phone}
                                                </div>
                                            )}
                                            {company.email && (
                                                <div className="text-sm text-muted-foreground">
                                                    {company.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {selectedIds.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {selectedIds.length} {selectedIds.length === 1 ? 'company' : 'companies'} selected
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={selectedIds.length === 0 || addMutation.isPending}
                    >
                        {addMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


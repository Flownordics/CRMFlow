import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Tags, Download, Edit, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useCompanyTags, useBulkAssignTags } from "@/services/companyTags";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Company } from "@/lib/schemas/company";
import { exportCompaniesToCSV } from "@/services/export/companiesExport";

interface BulkActionsMenuProps {
  selectedCompanyIds: string[];
  selectedCompanyNames: string[];
  selectedCompanies: Company[];
  onClearSelection: () => void;
}

export function BulkActionsMenu({ 
  selectedCompanyIds, 
  selectedCompanyNames,
  selectedCompanies,
  onClearSelection 
}: BulkActionsMenuProps) {
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");

  const { data: allTags } = useCompanyTags();
  const bulkAssignTags = useBulkAssignTags();

  const handleBulkTagAssignment = async () => {
    if (selectedTagIds.length === 0) {
      toast.error("Please select at least one tag");
      return;
    }

    try {
      await bulkAssignTags.mutateAsync({
        companyIds: selectedCompanyIds,
        tagIds: selectedTagIds,
      });
      toast.success(`Tags assigned to ${selectedCompanyIds.length} companies`);
      setTagDialogOpen(false);
      setSelectedTagIds([]);
      onClearSelection();
    } catch (error) {
      toast.error("Failed to assign tags");
    }
  };

  const handleBulkExport = () => {
    exportCompaniesToCSV(selectedCompanies);
    toast.success(`Exported ${selectedCompanyIds.length} companies`);
  };

  const handleBulkEmail = () => {
    toast.info("Bulk email functionality coming soon");
  };

  const handleBulkDelete = () => {
    toast.info("Bulk delete functionality coming soon");
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (selectedCompanyIds.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Bulk Actions ({selectedCompanyIds.length})
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions for {selectedCompanyIds.length} companies</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTagDialogOpen(true)}>
            <Tags className="mr-2 h-4 w-4" />
            Assign Tags
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBulkExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBulkEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Send Bulk Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag Assignment Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tags</DialogTitle>
            <DialogDescription>
              Select tags to assign to {selectedCompanyIds.length} companies
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allTags && allTags.length > 0 ? (
                allTags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag.id}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => toggleTagSelection(tag.id)}
                    />
                    <label
                      htmlFor={tag.id}
                      className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags available</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkTagAssignment} 
              disabled={bulkAssignTags.isPending || selectedTagIds.length === 0}
            >
              {bulkAssignTags.isPending ? "Assigning..." : "Assign Tags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


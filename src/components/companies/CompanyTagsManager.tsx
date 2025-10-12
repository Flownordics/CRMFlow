import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Check, Tag } from "lucide-react";
import { useCompanyTags, useCompanyTagsForCompany, useAssignTagToCompany, useRemoveTagFromCompany } from "@/services/companyTags";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompanyTagsManagerProps {
  companyId: string;
}

export function CompanyTagsManager({ companyId }: CompanyTagsManagerProps) {
  const [open, setOpen] = useState(false);
  const { data: allTags } = useCompanyTags();
  const { data: companyTags } = useCompanyTagsForCompany(companyId);
  const assignTag = useAssignTagToCompany();
  const removeTag = useRemoveTagFromCompany();

  const handleAssignTag = async (tagId: string) => {
    try {
      await assignTag.mutateAsync({ companyId, tagId });
      toast.success("Tag assigned");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to assign tag");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTag.mutateAsync({ companyId, tagId });
      toast.success("Tag removed");
    } catch (error) {
      toast.error("Failed to remove tag");
    }
  };

  const assignedTagIds = companyTags?.map(t => t.id) || [];
  const availableTags = allTags?.filter(tag => !assignedTagIds.includes(tag.id)) || [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {companyTags && companyTags.length > 0 ? (
        companyTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            style={{ 
              backgroundColor: `${tag.color}15`, 
              color: `${tag.color}CC`, 
              borderColor: `${tag.color}30` 
            }}
            className="flex items-center gap-1 pr-1 border"
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 rounded-full hover:bg-background/50 p-0.5"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))
      ) : (
        <span className="text-sm text-muted-foreground">No tags</span>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2">
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {availableTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleAssignTag(tag.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Compact version for list views
export function CompanyTagsBadges({ companyId }: { companyId: string }) {
  const { data: companyTags } = useCompanyTagsForCompany(companyId);

  if (!companyTags || companyTags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {companyTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          style={{ 
            backgroundColor: `${tag.color}15`, 
            color: `${tag.color}CC`, 
            borderColor: `${tag.color}30` 
          }}
          className="text-xs px-1.5 py-0 border"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}


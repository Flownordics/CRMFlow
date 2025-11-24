import { useState, useEffect } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdateProject, Project } from "@/services/projects";
import { useUsers } from "@/services/users";
import { toastBus } from "@/lib/toastBus";
import { FormRow } from "@/components/forms/FormRow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onUpdated?: () => void;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onUpdated,
}: EditProjectDialogProps) {
  const updateProject = useUpdateProject();
  const { data: users } = useUsers();

  const [name, setName] = useState(project.name || "");
  const [description, setDescription] = useState(project.description || "");
  const [startDate, setStartDate] = useState<Date | null>(
    project.start_date ? new Date(project.start_date) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    project.end_date ? new Date(project.end_date) : null
  );
  const [ownerUserId, setOwnerUserId] = useState<string>(
    project.owner_user_id || ""
  );
  const [budgetMinor, setBudgetMinor] = useState<string>(
    project.budget_minor ? (project.budget_minor / 100).toString() : ""
  );

  // Reset form when project changes or dialog opens
  useEffect(() => {
    if (open && project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStartDate(project.start_date ? new Date(project.start_date) : null);
      setEndDate(project.end_date ? new Date(project.end_date) : null);
      setOwnerUserId(project.owner_user_id || "");
      setBudgetMinor(project.budget_minor ? (project.budget_minor / 100).toString() : "");
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toastBus.emit({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        owner_user_id: ownerUserId || undefined,
        budget_minor: budgetMinor ? Math.round(parseFloat(budgetMinor) * 100) : undefined,
      });

      toastBus.emit({
        title: "Project Updated",
        description: `Project "${name.trim()}" has been updated successfully`,
      });

      onOpenChange(false);
      onUpdated?.();
    } catch (error: any) {
      toastBus.emit({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AccessibleDialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <FormRow
              label="Project Name"
              control={
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name"
                  autoFocus
                />
              }
            />

            <FormRow
              label="Description"
              control={
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter project description (optional)"
                  rows={4}
                />
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <FormRow
                label="Start Date"
                control={
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ?? undefined}
                        onSelect={(date) => setStartDate(date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                }
              />

              <FormRow
                label="End Date"
                control={
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (
                          format(endDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ?? undefined}
                        onSelect={(date) => setEndDate(date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                }
              />
            </div>

            <FormRow
              label="Owner"
              control={
                <Select
                  value={ownerUserId || "none"}
                  onValueChange={(value) =>
                    setOwnerUserId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No owner</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />

            <FormRow
              label="Budget"
              control={
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetMinor}
                  onChange={(e) => setBudgetMinor(e.target.value)}
                  placeholder="Enter budget amount"
                />
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? "Updating..." : "Update Project"}
            </Button>
          </DialogFooter>
        </form>
      </AccessibleDialogContent>
    </Dialog>
  );
}


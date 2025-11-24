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
import { useCreateProject } from "@/services/projects";
import { useDeal } from "@/services/deals";
import { toastBus } from "@/lib/toastBus";
import { FormRow } from "@/components/forms/FormRow";
import { useNavigate } from "react-router-dom";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  onCreated?: (projectId: string) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  dealId,
  onCreated,
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const { data: deal } = useDeal(dealId);
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Pre-fill name from deal title when dialog opens
  useEffect(() => {
    if (open && deal) {
      setName(deal.title);
      setDescription("");
    }
  }, [open, deal]);

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

    if (!deal) {
      toastBus.emit({
        title: "Error",
        description: "Deal not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        deal_id: dealId,
        name: name.trim(),
        description: description.trim() || undefined,
        company_id: deal.company_id,
        owner_user_id: deal.owner_user_id || undefined,
        status: "active",
      });

      toastBus.emit({
        title: "Project Created",
        description: `Project "${project.name}" has been created successfully`,
      });

      onOpenChange(false);
      
      if (onCreated) {
        onCreated(project.id);
      } else {
        // Navigate to project detail by default
        navigate(`/projects/${project.id}`);
      }
    } catch (error: any) {
      toastBus.emit({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AccessibleDialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project linked to deal: {deal?.title || dealId}
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

            {deal && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium">Linked Deal:</span> {deal.title}
                </div>
                {deal.company_id && (
                  <div>
                    <span className="font-medium">Company:</span> {deal.company_id}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </AccessibleDialogContent>
    </Dialog>
  );
}


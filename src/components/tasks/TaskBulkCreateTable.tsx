import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Save, X, Trash2, CalendarIcon } from "lucide-react";
import { useCreateTask } from "@/services/tasks";
import { useUsers } from "@/services/users";
import { toastBus } from "@/lib/toastBus";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskRow {
  id: string; // Temporary ID for tracking
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string;
  due_date: Date | null;
  estimated_hours: string;
}

interface TaskBulkCreateTableProps {
  relatedType: 'deal' | 'quote' | 'order' | 'invoice' | 'company' | 'person';
  relatedId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskBulkCreateTable({
  relatedType,
  relatedId,
  onSuccess,
  onCancel,
}: TaskBulkCreateTableProps) {
  const createTask = useCreateTask();
  const { data: users } = useUsers();

  const [rows, setRows] = useState<TaskRow[]>([
    {
      id: `temp-${Date.now()}`,
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      assigned_to: "",
      due_date: null,
      estimated_hours: "",
    },
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: `temp-${Date.now()}-${rows.length}`,
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        assigned_to: "",
        due_date: null,
        estimated_hours: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof TaskRow, value: string | Date | null) => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = async () => {
    // Filter out empty rows (rows without title)
    const validRows = rows.filter((row) => row.title.trim() !== "");

    if (validRows.length === 0) {
      toastBus.emit({
        title: "No tasks to create",
        description: "Please add at least one task with a title",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create all tasks in parallel
      await Promise.all(
        validRows.map((row) =>
          createTask.mutateAsync({
            title: row.title.trim(),
            description: row.description.trim() || undefined,
            status: row.status,
            priority: row.priority,
            assigned_to: row.assigned_to || undefined,
            due_date: row.due_date ? row.due_date.toISOString() : undefined,
            estimated_hours: row.estimated_hours
              ? parseFloat(row.estimated_hours)
              : undefined,
            related_type: relatedType,
            related_id: relatedId,
          })
        )
      );

      toastBus.emit({
        title: "Tasks Created",
        description: `Successfully created ${validRows.length} task${validRows.length > 1 ? "s" : ""}`,
      });

      onSuccess?.();
    } catch (error: any) {
      toastBus.emit({
        title: "Error",
        description: error.message || "Failed to create tasks",
        variant: "destructive",
      });
    }
  };

  const hasValidRows = rows.some((row) => row.title.trim() !== "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Bulk Create Tasks</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Add multiple tasks at once. Empty rows will be ignored.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasValidRows || createTask.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {createTask.isPending ? "Saving..." : `Save ${rows.filter(r => r.title.trim()).length} Task${rows.filter(r => r.title.trim()).length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[200px]">
                  Title *
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[150px]">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[120px]">
                  Priority
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[150px]">
                  Assignee
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[120px]">
                  Due Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[100px]">
                  Hours
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-[60px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b hover:bg-muted/30 transition-colors",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                >
                  <td className="px-3 py-2">
                    <Input
                      value={row.title}
                      onChange={(e) => updateRow(row.id, "title", e.target.value)}
                      placeholder="Task title..."
                      className="h-8 text-sm"
                      autoFocus={index === 0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.status}
                      onValueChange={(value) =>
                        updateRow(row.id, "status", value)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.priority}
                      onValueChange={(value) =>
                        updateRow(row.id, "priority", value)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.assigned_to || "unassigned"}
                      onValueChange={(value) =>
                        updateRow(row.id, "assigned_to", value === "unassigned" ? "" : value)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start font-normal h-8 text-sm"
                        >
                          {row.due_date ? format(row.due_date, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={row.due_date ?? undefined}
                          onSelect={(d) => updateRow(row.id, "due_date", d ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={row.estimated_hours}
                      onChange={(e) =>
                        updateRow(row.id, "estimated_hours", e.target.value)
                      }
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Textarea
                      value={row.description}
                      onChange={(e) =>
                        updateRow(row.id, "description", e.target.value)
                      }
                      placeholder="Description..."
                      className="h-8 text-sm resize-none"
                      rows={1}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {rows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {rows.length} row{rows.length !== 1 ? "s" : ""} •{" "}
          {rows.filter((r) => r.title.trim()).length} with title
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Another
          </Button>
        </div>
      </div>
    </div>
  );
}


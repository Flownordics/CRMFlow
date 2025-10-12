import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCallLists, useAddCompaniesToCallList, useCreateCallList } from "@/services/callLists";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddToCallListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyIds: string[];
    companyNames?: string[];
    onSuccess?: () => void;
}

export function AddToCallListDialog({
    open,
    onOpenChange,
    companyIds,
    companyNames = [],
    onSuccess,
}: AddToCallListDialogProps) {
    const { toast } = useToast();
    const [selectedListId, setSelectedListId] = useState<string>("");
    const [createNew, setCreateNew] = useState(false);
    const [newListName, setNewListName] = useState("");

    const { data: callLists, isLoading: listsLoading } = useCallLists({ mine: true });
    const createMutation = useCreateCallList();
    const addMutation = useAddCompaniesToCallList(selectedListId);

    const handleAdd = async () => {
        if (!selectedListId && !createNew) {
            toast({
                title: "Error",
                description: "Please select a call list or create a new one",
                variant: "destructive",
            });
            return;
        }

        try {
            let targetListId = selectedListId;

            // Create new list if needed
            if (createNew) {
                if (!newListName.trim()) {
                    toast({
                        title: "Error",
                        description: "Please enter a name for the new call list",
                        variant: "destructive",
                    });
                    return;
                }

                const newList = await createMutation.mutateAsync({
                    name: newListName,
                    isShared: false,
                });
                targetListId = newList.id;
            }

            // Add companies to the list
            const count = await addMutation.mutateAsync(companyIds);

            toast({
                title: "Success",
                description: `Added ${count} ${count === 1 ? 'company' : 'companies'} to call list`,
            });

            onOpenChange(false);
            setCreateNew(false);
            setNewListName("");
            setSelectedListId("");
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            // Check for duplicate entries
            if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
                toast({
                    title: "Duplicate Entries",
                    description: "Some companies are already in this call list",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: error?.message || "Failed to add companies to call list",
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add to Call List</DialogTitle>
                    <DialogDescription>
                        Add {companyIds.length} {companyIds.length === 1 ? 'company' : 'companies'} to a call list
                        {companyNames.length > 0 && companyNames.length <= 5 && (
                            <span className="block mt-2 text-sm">
                                {companyNames.join(", ")}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {createNew ? (
                        <div className="space-y-2">
                            <Label htmlFor="new-list-name">New Call List Name</Label>
                            <Input
                                id="new-list-name"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="Enter list name..."
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCreateNew(false)}
                            >
                                ← Select existing list instead
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="call-list">Select Call List</Label>
                            <Select value={selectedListId} onValueChange={setSelectedListId}>
                                <SelectTrigger id="call-list">
                                    <SelectValue placeholder="Select a call list..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {listsLoading ? (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            Loading...
                                        </div>
                                    ) : callLists && callLists.length > 0 ? (
                                        callLists.map((list) => (
                                            <SelectItem key={list.id} value={list.id}>
                                                {list.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            No call lists found
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCreateNew(true)}
                            >
                                + Create new call list
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={createMutation.isPending || addMutation.isPending}
                    >
                        {(createMutation.isPending || addMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add to List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


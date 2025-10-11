import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Edit, Play, Share2, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useCallLists,
    useDeleteCallList,
    useCreateCallList,
    useAutoGenerateCallList,
} from "@/services/callLists";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function CallLists() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showAutoGenDialog, setShowAutoGenDialog] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [newListShared, setNewListShared] = useState(false);
    const [autoGenLimit, setAutoGenLimit] = useState(20);

    const { data: callLists, isLoading } = useCallLists({ mine: true });
    const createMutation = useCreateCallList();
    const deleteMutation = useDeleteCallList();
    const autoGenMutation = useAutoGenerateCallList();

    const handleCreate = async () => {
        if (!newListName.trim()) {
            toast({
                title: "Error",
                description: "Please enter a name for the call list",
                variant: "destructive",
            });
            return;
        }

        try {
            const newList = await createMutation.mutateAsync({
                name: newListName,
                isShared: newListShared,
            });

            toast({
                title: "Call List Created",
                description: `${newListName} has been created`,
            });

            setShowCreateDialog(false);
            setNewListName("");
            setNewListShared(false);

            // Navigate to the new list
            navigate(`/call-lists/${newList.id}`);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create call list",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the call list "${name}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id);
            toast({
                title: "Call List Deleted",
                description: `${name} has been deleted`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete call list",
                variant: "destructive",
            });
        }
    };

    const handleAutoGenerate = async () => {
        try {
            const result = await autoGenMutation.mutateAsync({
                name: `Auto Call List (${new Date().toLocaleDateString('en-US')})`,
                limit: autoGenLimit,
            });

            toast({
                title: "Auto Call List Generated",
                description: `${result.itemCount} companies added to the call list`,
            });

            setShowAutoGenDialog(false);
            navigate(`/call-lists/${result.callListId}`);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate auto call list",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Call Lists</h1>
                    <p className="text-muted-foreground mt-1">
                        Organize and manage your sales calls
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowAutoGenDialog(true)}
                        variant="outline"
                        className="gap-2"
                    >
                        <Zap className="h-4 w-4" />
                        Auto Call List (20)
                    </Button>
                    <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Call List
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : callLists && callLists.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>My Call Lists</CardTitle>
                        <CardDescription>
                            Click on a call list to start calling
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {callLists.map((list) => (
                                    <TableRow
                                        key={list.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => navigate(`/call-lists/${list.id}`)}
                                    >
                                        <TableCell className="font-medium">{list.name}</TableCell>
                                        <TableCell>
                                            {list.isShared && (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Share2 className="h-3 w-3" />
                                                    Shared
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(list.createdAt).toLocaleDateString('en-US')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/call-lists/${list.id}`)}
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(list.id, list.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            You don't have any call lists yet
                        </p>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            Create your first call list
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Call List</DialogTitle>
                        <DialogDescription>
                            Give your call list a name and choose whether to share it with your team
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="e.g. Today's Calls"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="shared">Share with team</Label>
                            <Switch
                                id="shared"
                                checked={newListShared}
                                onCheckedChange={setNewListShared}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Auto-Generate Dialog */}
            <Dialog open={showAutoGenDialog} onOpenChange={setShowAutoGenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Auto Call List</DialogTitle>
                        <DialogDescription>
                            The system will automatically select companies based on activity status.
                            Priority: Red (inactive) → Yellow → Green
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="limit">Number of companies</Label>
                            <Input
                                id="limit"
                                type="number"
                                min="1"
                                max="100"
                                value={autoGenLimit}
                                onChange={(e) => setAutoGenLimit(parseInt(e.target.value) || 20)}
                            />
                        </div>
                        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                            <p className="font-medium">Criteria:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>Excludes companies without phone number</li>
                                <li>Excludes companies marked "Do not call"</li>
                                <li>Prioritizes companies with oldest last activity first</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAutoGenDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAutoGenerate} disabled={autoGenMutation.isPending}>
                            {autoGenMutation.isPending ? "Generating..." : "Generate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

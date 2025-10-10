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
                title: "Fejl",
                description: "Indtast venligst et navn til ringelisten",
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
                title: "Ringeliste oprettet",
                description: `${newListName} er blevet oprettet`,
            });

            setShowCreateDialog(false);
            setNewListName("");
            setNewListShared(false);

            // Navigate to the new list
            navigate(`/call-lists/${newList.id}`);
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke oprette ringeliste",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Er du sikker på, at du vil slette ringelisten "${name}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id);
            toast({
                title: "Ringeliste slettet",
                description: `${name} er blevet slettet`,
            });
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke slette ringeliste",
                variant: "destructive",
            });
        }
    };

    const handleAutoGenerate = async () => {
        try {
            const result = await autoGenMutation.mutateAsync({
                name: `Auto-ringeliste (${new Date().toLocaleDateString('da-DK')})`,
                limit: autoGenLimit,
            });

            toast({
                title: "Auto-ringeliste genereret",
                description: `${result.itemCount} virksomheder tilføjet til ringelisten`,
            });

            setShowAutoGenDialog(false);
            navigate(`/call-lists/${result.callListId}`);
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke generere auto-ringeliste",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Ringelister</h1>
                    <p className="text-muted-foreground mt-1">
                        Organiser og administrer dine salgsopkald
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowAutoGenDialog(true)}
                        variant="outline"
                        className="gap-2"
                    >
                        <Zap className="h-4 w-4" />
                        Auto-ringeliste (20)
                    </Button>
                    <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ny ringeliste
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
                        <CardTitle>Mine ringelister</CardTitle>
                        <CardDescription>
                            Klik på en ringeliste for at starte opkald
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Navn</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Oprettet</TableHead>
                                    <TableHead className="text-right">Handlinger</TableHead>
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
                                                    Delt
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(list.createdAt).toLocaleDateString('da-DK')}
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
                            Du har ingen ringelister endnu
                        </p>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            Opret din første ringeliste
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Opret ny ringeliste</DialogTitle>
                        <DialogDescription>
                            Giv din ringeliste et navn og vælg om den skal deles med teamet
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Navn</Label>
                            <Input
                                id="name"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="f.eks. Dagens opkald"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="shared">Del med team</Label>
                            <Switch
                                id="shared"
                                checked={newListShared}
                                onCheckedChange={setNewListShared}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Annuller
                        </Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Opretter..." : "Opret"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Auto-Generate Dialog */}
            <Dialog open={showAutoGenDialog} onOpenChange={setShowAutoGenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generer auto-ringeliste</DialogTitle>
                        <DialogDescription>
                            Systemet vil automatisk vælge virksomheder baseret på aktivitetsstatus.
                            Prioriteret: Rød (inaktive) → Gul → Grøn
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="limit">Antal virksomheder</Label>
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
                            <p className="font-medium">Kriterier:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>Udelukker virksomheder uden telefonnummer</li>
                                <li>Udelukker virksomheder markeret "Ring ikke"</li>
                                <li>Prioriterer virksomheder med ældst sidste aktivitet først</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAutoGenDialog(false)}>
                            Annuller
                        </Button>
                        <Button onClick={handleAutoGenerate} disabled={autoGenMutation.isPending}>
                            {autoGenMutation.isPending ? "Genererer..." : "Generer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

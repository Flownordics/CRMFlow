import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Phone,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    Mail,
    Download,
    Trash2,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useCallList,
    useCallListItems,
    useUpdateCallListItem,
    exportCallListToCsv,
    useDeleteCallList,
    useAddCompaniesToCallList,
} from "@/services/callLists";
import { useLogCompanyActivity } from "@/services/activityLog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ActivityStatusBadge } from "@/components/companies/ActivityStatusBadge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export default function CallListDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [callOutcome, setCallOutcome] = useState("");
    const [callNotes, setCallNotes] = useState("");

    const { data: callList, isLoading: listLoading } = useCallList(id!);
    const { data: items, isLoading: itemsLoading } = useCallListItems(id!);
    const updateItemMutation = useUpdateCallListItem(items?.[currentIndex]?.id || "", id!);
    const logActivityMutation = useLogCompanyActivity(items?.[currentIndex]?.company?.id || "");
    const deleteMutation = useDeleteCallList();

    const isLoading = listLoading || itemsLoading;
    const currentItem = items?.[currentIndex];
    const company = currentItem?.company;

    const completedCount = items?.filter(item => item.status === 'completed').length || 0;
    const totalCount = items?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleNext = () => {
        if (items && currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCallOutcome("");
            setCallNotes("");
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setCallOutcome("");
            setCallNotes("");
        }
    };

    const handleLogActivity = async () => {
        if (!callOutcome) {
            toast({
                title: "Vælg udfald",
                description: "Vælg venligst udfaldet af opkaldet",
                variant: "destructive",
            });
            return;
        }

        if (!currentItem || !company) return;

        try {
            // Log the activity
            await logActivityMutation.mutateAsync({
                companyId: company.id,
                type: 'call',
                outcome: callOutcome,
                notes: callNotes,
            });

            // Update the call list item status
            await updateItemMutation.mutateAsync({
                status: 'completed',
                notes: callNotes,
            });

            toast({
                title: "Aktivitet logget",
                description: `Opkald til ${company.name} er blevet logget`,
            });

            // Clear form and move to next
            setCallOutcome("");
            setCallNotes("");

            // Auto-advance to next item
            setTimeout(() => {
                if (items && currentIndex < items.length - 1) {
                    handleNext();
                }
            }, 500);
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke logge aktivitet",
                variant: "destructive",
            });
        }
    };

    const handleSkip = async () => {
        if (!currentItem) return;

        try {
            await updateItemMutation.mutateAsync({
                status: 'skipped',
            });

            toast({
                title: "Sprunget over",
                description: "Virksomheden blev sprunget over",
            });

            handleNext();
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke springe over",
                variant: "destructive",
            });
        }
    };

    const handleExport = async () => {
        try {
            await exportCallListToCsv(id!);
            toast({
                title: "Eksporteret",
                description: "Ringelisten er blevet eksporteret til CSV",
            });
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke eksportere ringeliste",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!callList) return;

        if (!confirm(`Er du sikker på, at du vil slette ringelisten "${callList.name}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id!);
            toast({
                title: "Ringeliste slettet",
                description: `${callList.name} er blevet slettet`,
            });
            navigate("/call-lists");
        } catch (error) {
            toast({
                title: "Fejl",
                description: "Kunne ikke slette ringeliste",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!callList || !items || items.length === 0) {
        return (
            <div className="container mx-auto py-6">
                <Button variant="ghost" onClick={() => navigate("/call-lists")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tilbage
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            Denne ringeliste er tom
                        </p>
                        <Button onClick={() => navigate("/call-lists")}>
                            Tilbage til oversigt
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/call-lists")}
                        className="mb-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tilbage
                    </Button>
                    <h1 className="text-3xl font-bold">{callList.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        {completedCount} af {totalCount} gennemført
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Eksporter
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Slet liste
                    </Button>
                </div>
            </div>

            {/* Progress */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Fremskridt</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                    </div>
                </CardContent>
            </Card>

            {/* Main Call Flow */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Company Info */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-2xl">{company?.name}</CardTitle>
                                <CardDescription>
                                    Position {currentIndex + 1} af {totalCount}
                                </CardDescription>
                            </div>
                            <ActivityStatusBadge
                                status={company?.activityStatus as any}
                                lastActivityAt={company?.lastActivityAt}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {company?.phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`tel:${company.phone}`}
                                    className="text-lg font-medium hover:underline"
                                >
                                    {company.phone}
                                </a>
                            </div>
                        )}

                        {company?.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`mailto:${company.email}`}
                                    className="text-sm hover:underline"
                                >
                                    {company.email}
                                </a>
                            </div>
                        )}

                        {currentItem.notes && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Noter:</p>
                                <p className="text-sm text-muted-foreground">{currentItem.notes}</p>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentIndex === 0}
                                className="flex-1"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Forrige
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleNext}
                                disabled={currentIndex === items.length - 1}
                                className="flex-1"
                            >
                                Næste
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Call Logging */}
                <Card>
                    <CardHeader>
                        <CardTitle>Log aktivitet</CardTitle>
                        <CardDescription>
                            Registrer udfaldet af dit opkald
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="outcome">Udfald</Label>
                            <Select value={callOutcome} onValueChange={setCallOutcome}>
                                <SelectTrigger id="outcome">
                                    <SelectValue placeholder="Vælg udfald" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            Gennemført - Samtale afholdt
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="voicemail">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-blue-600" />
                                            Voicemail efterladt
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="no_answer">
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-orange-600" />
                                            Intet svar
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="scheduled_followup">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-purple-600" />
                                            Aftalt opfølgning
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="not_interested">
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                            Ikke interesseret
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Noter (valgfrit)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Tilføj noter om samtalen..."
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleLogActivity}
                                disabled={!callOutcome || logActivityMutation.isPending}
                                className="flex-1"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {logActivityMutation.isPending ? "Logger..." : "Log aktivitet"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleSkip}
                                disabled={updateItemMutation.isPending}
                            >
                                Spring over
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* All Items List */}
            <Card>
                <CardHeader>
                    <CardTitle>Alle virksomheder i listen</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${index === currentIndex ? 'bg-muted border-primary' : ''
                                    }`}
                                onClick={() => {
                                    setCurrentIndex(index);
                                    setCallOutcome("");
                                    setCallNotes("");
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground w-8">
                                        #{index + 1}
                                    </span>
                                    <ActivityStatusBadge
                                        status={item.company?.activityStatus as any}
                                        lastActivityAt={item.company?.lastActivityAt}
                                    />
                                    <span className="font-medium">{item.company?.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.status === 'completed' && (
                                        <Badge variant="default" className="bg-green-600">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Gennemført
                                        </Badge>
                                    )}
                                    {item.status === 'skipped' && (
                                        <Badge variant="secondary">
                                            Spring over
                                        </Badge>
                                    )}
                                    {item.status === 'pending' && (
                                        <Badge variant="outline">
                                            Afventer
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

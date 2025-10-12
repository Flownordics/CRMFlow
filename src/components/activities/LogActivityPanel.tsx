import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Mail } from "lucide-react";
import { useLogCompanyActivity } from "@/services/activityLog";
import { useToast } from "@/hooks/use-toast";

interface LogActivityPanelProps {
    companyId: string;
    companyName?: string;
    onActivityLogged?: () => void;
    showTitle?: boolean;
    // Optional skip functionality for call lists
    onSkip?: () => void;
    skipLabel?: string;
    skipDisabled?: boolean;
}

export function LogActivityPanel({ 
    companyId, 
    companyName, 
    onActivityLogged,
    showTitle = true,
    onSkip,
    skipLabel = "Skip",
    skipDisabled = false
}: LogActivityPanelProps) {
    const [callOutcome, setCallOutcome] = useState("");
    const [callNotes, setCallNotes] = useState("");
    const { toast } = useToast();
    const logActivityMutation = useLogCompanyActivity(companyId);

    const handleLogActivity = async () => {
        if (!callOutcome) {
            toast({
                title: "Select Outcome",
                description: "Please select the outcome of the call",
                variant: "destructive",
            });
            return;
        }

        try {
            await logActivityMutation.mutateAsync({
                companyId,
                type: 'call',
                outcome: callOutcome,
                notes: callNotes,
            });

            toast({
                title: "Activity Logged",
                description: companyName 
                    ? `Call to ${companyName} has been logged`
                    : "Activity has been logged successfully",
            });

            // Clear form
            setCallOutcome("");
            setCallNotes("");

            // Callback for parent component
            if (onActivityLogged) {
                onActivityLogged();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to log activity",
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            {showTitle && (
                <CardHeader>
                    <CardTitle>Log Activity</CardTitle>
                    <CardDescription>
                        Record the outcome of your call
                    </CardDescription>
                </CardHeader>
            )}
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="outcome">Outcome</Label>
                    <Select value={callOutcome} onValueChange={setCallOutcome}>
                        <SelectTrigger id="outcome">
                            <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="completed">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-[#6b7c5e]" />
                                    Completed - Call held
                                </div>
                            </SelectItem>
                            <SelectItem value="voicemail">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-[#7a9db3]" />
                                    Voicemail left
                                </div>
                            </SelectItem>
                            <SelectItem value="no_answer">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-[#9d855e]" />
                                    No answer
                                </div>
                            </SelectItem>
                            <SelectItem value="scheduled_followup">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#9d94af]" />
                                    Follow-up scheduled
                                </div>
                            </SelectItem>
                            <SelectItem value="not_interested">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-[#b8695f]" />
                                    Not interested
                                </div>
                            </SelectItem>
                            <SelectItem value="busy">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-[#9d855e]" />
                                    Busy
                                </div>
                            </SelectItem>
                            <SelectItem value="wrong_number">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-[#b8695f]" />
                                    Wrong number
                                </div>
                            </SelectItem>
                            <SelectItem value="callback_requested">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#9d94af]" />
                                    Callback requested
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                        id="notes"
                        placeholder="Add notes about the call..."
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        rows={4}
                    />
                </div>

                <div className={onSkip ? "flex gap-2 pt-2" : ""}>
                    <Button
                        onClick={handleLogActivity}
                        disabled={!callOutcome || logActivityMutation.isPending}
                        className={onSkip ? "flex-1" : "w-full"}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {logActivityMutation.isPending ? "Logging..." : "Log Activity"}
                    </Button>
                    {onSkip && (
                        <Button
                            variant="outline"
                            onClick={onSkip}
                            disabled={skipDisabled}
                        >
                            {skipLabel}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


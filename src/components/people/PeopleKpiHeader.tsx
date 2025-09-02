import { Card } from "@/components/ui/card";
import { Users, Mail, Phone, UserPlus } from "lucide-react";

interface PeopleKpiHeaderProps {
    total: number;
    withEmail: number;
    withPhone: number;
    newThisMonth: number;
}

export function PeopleKpiHeader({ total, withEmail, withPhone, newThisMonth }: PeopleKpiHeaderProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total People */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total people</div>
                        <div className="text-h2">{total}</div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
            </Card>

            {/* With Email */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">With email</div>
                        <div className="text-h2">{withEmail}</div>
                    </div>
                    <div className="rounded-full p-2 bg-success/10">
                        <Mail className="h-4 w-4 text-success" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-success/5 to-transparent" aria-hidden="true" />
            </Card>

            {/* With Phone */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">With phone</div>
                        <div className="text-h2">{withPhone}</div>
                    </div>
                    <div className="rounded-full p-2 bg-accent/10">
                        <Phone className="h-4 w-4 text-accent" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent" aria-hidden="true" />
            </Card>

            {/* New This Month */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">New this month</div>
                        <div className="text-h2">{newThisMonth}</div>
                    </div>
                    <div className="rounded-full p-2 bg-warning/10">
                        <UserPlus className="h-4 w-4 text-warning" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-warning/5 to-transparent" aria-hidden="true" />
            </Card>
        </div>
    );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Mail, Phone, Briefcase, Calendar, Clock } from "lucide-react";
import { Person } from "@/lib/schemas/person";
import { toastBus } from "@/lib/toastBus";

interface PersonOverviewProps {
    person: Person;
}

export function PersonOverview({ person }: PersonOverviewProps) {
    const { t } = useI18n();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toastBus.emit({
            title: t("common.copied"),
            description: `${label} copied to clipboard`,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {t("people.contact")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {person.email ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{person.email}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(person.email!, "Email")}
                                aria-label="Copy email"
                            >
                                Copy
                            </Button>
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">{t("people.noContactInfo")}</span>
                    )}
                    
                    {person.phone ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="h-3 w-3" aria-hidden="true" />
                                {person.phone}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(person.phone!, "Phone")}
                                aria-label="Copy phone"
                            >
                                Copy
                            </Button>
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">{t("people.noContactInfo")}</span>
                    )}
                </CardContent>
            </Card>

            {/* Role Information */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4" aria-hidden="true" />
                        {t("people.role")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {person.title ? (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">{person.title}</Badge>
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">{t("people.noRoleInfo")}</span>
                    )}
                    
                    {person.companyId ? (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                <a 
                                    href={`/companies/${person.companyId}`}
                                    className="hover:underline"
                                >
                                    Company
                                </a>
                            </Badge>
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">No company assigned</span>
                    )}
                </CardContent>
            </Card>

            {/* Meta Information */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        Meta
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {person.createdAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>Created: {formatDate(person.createdAt)}</span>
                        </div>
                    )}
                    
                    {person.updatedAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>Updated: {formatDate(person.updatedAt)}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

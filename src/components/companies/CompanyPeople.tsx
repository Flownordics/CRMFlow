import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanyPeople } from "@/services/companies";
import { useI18n } from "@/lib/i18n";
import { Users, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

interface CompanyPeopleProps {
  companyId: string;
  onAddPerson: () => void;
}

export function CompanyPeople({ companyId, onAddPerson }: CompanyPeopleProps) {
  const { t } = useI18n();
  const { data: people, isLoading } = useCompanyPeople(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("companies.people")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!people || people.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("companies.people")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title={t("companies.noPeopleYet")}
            description={t("companies.noPeopleDescription")}
            action={
              <Button onClick={onAddPerson}>
                <Plus className="h-4 w-4 mr-2" />
                {t("companies.addPerson")}
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("companies.people")}
        </CardTitle>
        <Button onClick={onAddPerson}>
          <Plus className="h-4 w-4 mr-2" />
          {t("companies.addPerson")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {people.map((person) => (
            <div key={person.id} className="flex items-center space-x-4 p-3 rounded-lg border">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {person.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{person.name}</p>
                {person.email && (
                  <p className="text-sm text-muted-foreground truncate">{person.email}</p>
                )}
              </div>
              {person.phone && (
                <p className="text-sm text-muted-foreground">{person.phone}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

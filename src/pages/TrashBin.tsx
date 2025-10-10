import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Trash2, 
  Building2, 
  Users, 
  Briefcase, 
  FileText, 
  Receipt, 
  Package 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchDeletedCompanies, 
  restoreCompany, 
  useDeletedCompanies, 
  useRestoreCompany 
} from '@/services/companies';
import { fetchDeletedPeople, restorePerson } from '@/services/people';
import { fetchDeletedDeals, restoreDeal } from '@/services/deals';
import { fetchDeletedInvoices, restoreInvoice } from '@/services/invoices';
import { apiClient } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type DeletedItemType = 'companies' | 'people' | 'deals' | 'quotes' | 'orders' | 'invoices';

export default function TrashBin() {
  const [activeTab, setActiveTab] = useState<DeletedItemType>('companies');
  const [confirmRestore, setConfirmRestore] = useState<{ id: string; name: string; type: DeletedItemType } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries for deleted items
  const { data: deletedCompanies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['deleted-companies'],
    queryFn: () => fetchDeletedCompanies(50),
    enabled: activeTab === 'companies'
  });

  const { data: deletedPeople, isLoading: loadingPeople } = useQuery({
    queryKey: ['deleted-people'],
    queryFn: () => fetchDeletedPeople(50),
    enabled: activeTab === 'people'
  });

  const { data: deletedDeals, isLoading: loadingDeals } = useQuery({
    queryKey: ['deleted-deals'],
    queryFn: () => fetchDeletedDeals(50),
    enabled: activeTab === 'deals'
  });

  const { data: deletedInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['deleted-invoices'],
    queryFn: () => fetchDeletedInvoices(50),
    enabled: activeTab === 'invoices'
  });

  // Restore mutations
  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: DeletedItemType }) => {
      switch (type) {
        case 'companies':
          return restoreCompany(id);
        case 'people':
          return restorePerson(id);
        case 'deals':
          return restoreDeal(id);
        case 'invoices':
          return restoreInvoice(id);
        default:
          throw new Error(`Unsupported type: ${type}`);
      }
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`deleted-${type}`] });
      queryClient.invalidateQueries({ queryKey: [type] });
      toast({
        title: 'Gendannet!',
        description: 'Objektet er blevet gendannet fra papirkurven.',
      });
    },
    onError: () => {
      toast({
        title: 'Fejl',
        description: 'Kunne ikke gendanne objektet. Prøv igen.',
        variant: 'destructive',
      });
    }
  });

  const handleRestore = (id: string, name: string, type: DeletedItemType) => {
    setConfirmRestore({ id, name, type });
  };

  const confirmRestoreAction = () => {
    if (confirmRestore) {
      restoreMutation.mutate({
        id: confirmRestore.id,
        type: confirmRestore.type
      });
      setConfirmRestore(null);
    }
  };

  const getIcon = (type: DeletedItemType) => {
    switch (type) {
      case 'companies': return <Building2 className="h-4 w-4" />;
      case 'people': return <Users className="h-4 w-4" />;
      case 'deals': return <Briefcase className="h-4 w-4" />;
      case 'quotes': return <FileText className="h-4 w-4" />;
      case 'orders': return <Package className="h-4 w-4" />;
      case 'invoices': return <Receipt className="h-4 w-4" />;
    }
  };

  const getEmptyMessage = (type: DeletedItemType) => {
    return `Ingen slettede ${type === 'companies' ? 'virksomheder' : 
      type === 'people' ? 'personer' :
      type === 'deals' ? 'deals' :
      type === 'quotes' ? 'tilbud' :
      type === 'orders' ? 'ordrer' : 'fakturaer'} fundet.`;
  };

  const renderDeletedItem = (item: any, type: DeletedItemType) => {
    const name = type === 'people' 
      ? `${item.first_name} ${item.last_name}` 
      : item.name || item.title || item.number || 'Unavngivet';
    
    const deletedAt = item.deleted_at || item.deletedAt;

    return (
      <Card key={item.id} className="mb-2 hover:shadow-md transition-shadow">
        <CardContent className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-md">
              {getIcon(type)}
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">
                Slettet {formatDistanceToNow(new Date(deletedAt), { 
                  addSuffix: true, 
                  locale: da 
                })}
              </p>
              {item.email && (
                <p className="text-xs text-muted-foreground">{item.email}</p>
              )}
            </div>
          </div>
          <Button 
            onClick={() => handleRestore(item.id, name, type)}
            variant="outline"
            size="sm"
            disabled={restoreMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Gendan
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trash2 className="h-8 w-8" />
          Papirkurv
        </h1>
        <p className="text-muted-foreground mt-2">
          Slettede elementer gemmes i 90 dage. Derefter slettes de permanent.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeletedItemType)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="companies" className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            Virksomheder
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Personer
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-1" disabled>
            <FileText className="h-4 w-4" />
            Tilbud
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1" disabled>
            <Package className="h-4 w-4" />
            Ordrer
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1">
            <Receipt className="h-4 w-4" />
            Fakturaer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-6">
          {loadingCompanies ? (
            <p className="text-center text-muted-foreground">Indlæser...</p>
          ) : deletedCompanies && deletedCompanies.length > 0 ? (
            deletedCompanies.map(company => renderDeletedItem(company, 'companies'))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {getEmptyMessage('companies')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-6">
          {loadingPeople ? (
            <p className="text-center text-muted-foreground">Indlæser...</p>
          ) : deletedPeople && deletedPeople.length > 0 ? (
            deletedPeople.map(person => renderDeletedItem(person, 'people'))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {getEmptyMessage('people')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-6">
          {loadingDeals ? (
            <p className="text-center text-muted-foreground">Indlæser...</p>
          ) : deletedDeals && deletedDeals.length > 0 ? (
            deletedDeals.map(deal => renderDeletedItem(deal, 'deals'))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {getEmptyMessage('deals')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          {loadingInvoices ? (
            <p className="text-center text-muted-foreground">Indlæser...</p>
          ) : deletedInvoices && deletedInvoices.length > 0 ? (
            deletedInvoices.map(invoice => renderDeletedItem(invoice, 'invoices'))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {getEmptyMessage('invoices')}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gendan fra papirkurv?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil gendanne "{confirmRestore?.name}"?
              <br />
              Objektet vil blive gendannet og være tilgængeligt igen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestoreAction}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Gendan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


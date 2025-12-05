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
import { useToast } from '@/hooks/use-toast';
import { 
  fetchDeletedCompanies, 
  restoreCompany, 
  useDeletedCompanies, 
  useRestoreCompany 
} from '@/services/companies';
import { fetchDeletedPeople, restorePerson } from '@/services/people';
import { fetchDeletedDeals, restoreDeal } from '@/services/deals';
import { fetchDeletedQuotes, restoreQuote } from '@/services/quotes';
import { fetchDeletedOrders, restoreOrder } from '@/services/orders';
import { fetchDeletedInvoices, restoreInvoice } from '@/services/invoices';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

type DeletedItemType = 'companies' | 'people' | 'deals' | 'quotes' | 'orders' | 'invoices';

export function TrashBinSettings() {
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

  const { data: deletedQuotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['deleted-quotes'],
    queryFn: () => fetchDeletedQuotes(50),
    enabled: activeTab === 'quotes'
  });

  const { data: deletedOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['deleted-orders'],
    queryFn: () => fetchDeletedOrders(50),
    enabled: activeTab === 'orders'
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
        case 'quotes':
          return restoreQuote(id);
        case 'orders':
          return restoreOrder(id);
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
        title: 'Restored!',
        description: 'The item has been restored from trash.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to restore the item. Please try again.',
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
    return `No deleted ${type === 'companies' ? 'companies' : 
      type === 'people' ? 'people' :
      type === 'deals' ? 'deals' :
      type === 'quotes' ? 'quotes' :
      type === 'orders' ? 'orders' : 'invoices'} found.`;
  };

  const renderDeletedItem = (item: any, type: DeletedItemType) => {
    const name = type === 'people' 
      ? `${item.first_name} ${item.last_name}` 
      : item.name || item.title || item.number || 'Unnamed';
    
    const deletedAt = item.deleted_at || item.deletedAt;
    
    // Validate and format the deleted date
    const deletedDate = deletedAt ? new Date(deletedAt) : null;
    const isValidDate = deletedDate && !isNaN(deletedDate.getTime());
    const deletedTimeText = isValidDate 
      ? formatDistanceToNow(deletedDate, { addSuffix: true })
      : 'Unknown time';

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
                Deleted {deletedTimeText}
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
            Restore
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Trash Bin
          </CardTitle>
          <CardDescription>
            Deleted items are stored for 90 days. After that, they are permanently deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeletedItemType)}>
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="companies" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Companies</span>
              </TabsTrigger>
              <TabsTrigger value="people" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">People</span>
              </TabsTrigger>
              <TabsTrigger value="deals" className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Deals</span>
              </TabsTrigger>
              <TabsTrigger value="quotes" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Quotes</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-1">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Invoices</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="mt-6">
              {loadingCompanies ? (
                <p className="text-center text-muted-foreground">Loading...</p>
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
                <p className="text-center text-muted-foreground">Loading...</p>
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
                <p className="text-center text-muted-foreground">Loading...</p>
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

            <TabsContent value="quotes" className="mt-6">
              {loadingQuotes ? (
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : deletedQuotes && deletedQuotes.length > 0 ? (
                deletedQuotes.map(quote => renderDeletedItem(quote, 'quotes'))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {getEmptyMessage('quotes')}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              {loadingOrders ? (
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : deletedOrders && deletedOrders.length > 0 ? (
                deletedOrders.map(order => renderDeletedItem(order, 'orders'))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {getEmptyMessage('orders')}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              {loadingInvoices ? (
                <p className="text-center text-muted-foreground">Loading...</p>
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
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmRestore && (
        <ConfirmationDialog
          open={!!confirmRestore}
          onOpenChange={(open) => {
            if (!open) setConfirmRestore(null);
          }}
          title="Restore from trash?"
          description={`Are you sure you want to restore "${confirmRestore.name}"? The item will be restored and available again.`}
          confirmText="Restore"
          cancelText="Cancel"
          onConfirm={confirmRestoreAction}
          variant="default"
        />
      )}
    </div>
  );
}


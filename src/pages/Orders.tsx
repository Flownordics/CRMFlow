import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";
import {
  Plus,
  Search,
  Filter,
  FileDown,
  FileSymlink,
  FileText,
  List,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderUI } from "@/services/orders";
import { useOrders } from "@/services/orders";
import { getPdfUrl } from "@/services/PDFService";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  OrdersKpiHeader,
  OrdersStatusFilters,
  OrderCard,
  OrdersEmptyState,
  getOrderStatusTheme,
  statusTokenBg,
  statusTokenText
} from "@/components/orders";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { formatMoneyMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [localOrderUpdates, setLocalOrderUpdates] = useState<Record<string, Partial<OrderUI>>>({});
  const { toast } = useToast();
  const { getCompanyName } = useCompanyLookup();
  const queryClient = useQueryClient();

  // Fetch orders from API
  const { data: ordersData, isLoading, error, refetch } = useOrders({
    q: searchTerm,
  });

  const orders = ordersData?.data || [];

  // Apply local updates to orders
  const ordersWithLocalUpdates = orders.map(order => ({
    ...order,
    ...localOrderUpdates[order.id]
  }));

  const filteredOrders = ordersWithLocalUpdates.filter((order) => {
    const matchesSearch = order.number
      ? order.number.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Function to update order status locally
  const updateOrderStatusLocally = (orderId: string, status: string) => {
    setLocalOrderUpdates(prev => ({
      ...prev,
      [orderId]: { status }
    }));
  };


  const handleGeneratePDF = async (order: OrderUI) => {
    try {
      const pdfResponse = await getPdfUrl("order", order.id);
      window.open(pdfResponse.url, "_blank");

      toast({
        title: "PDF Generated",
        description: `Order ${order.number} has been opened in a new tab.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    // This function is not used in the current filteredOrders logic,
    // but keeping it as it was in the original file.
    // setOrders(orders.filter((o) => o.id !== orderId));
    toast({
      title: "Order Deleted",
      description: "The order has been removed.",
    });
  };

  const handleStatusChange = (orderId: string, newStatus: OrderUI["status"]) => {
    // This function is not used in the current filteredOrders logic,
    // but keeping it as it was in the original file.
    // setOrders(
    //   orders.map((order) =>
    //     order.id === orderId
    //       ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
    //       : order,
    // ),
    // );

    toast({
      title: "Status Updated",
      description: `Order status changed to ${newStatus}.`,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Orders"
        subtitle="From confirmation to fulfilment — status, dates and totals at a glance."
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            New Order
          </Button>
        }
      />

      {/* Gradient Divider */}
      <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />

      {/* KPI Header */}
      <OrdersKpiHeader orders={orders} currency="DKK" />

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground"
              />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter aria-hidden="true" className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-card p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-2"
                aria-label="Table view"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-2"
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <OrdersStatusFilters
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          counts={orders.reduce((acc, o) => {
            const status = o.status || "draft";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)}
        />
      </div>

      {/* Orders View */}
      {filteredOrders.length === 0 ? (
        <div className="p-8">
          <OrdersEmptyState
            onCreateOrder={() => setCreateModalOpen(true)}
            onConvertFromQuote={() => navigate("/quotes")}
          />
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Order # + Relation</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Order Date • Delivery Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const theme = getOrderStatusTheme(order.status);
              const Icon = theme.icon;

              const formatDate = (dateString?: string | null) => {
                if (!dateString) return "—";
                return new Date(dateString).toLocaleDateString();
              };

              const isDueSoon = (dateString?: string | null) => {
                if (!dateString) return false;
                const deliveryDate = new Date(dateString);
                const now = new Date();
                const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                return deliveryDate <= sevenDaysFromNow && deliveryDate >= now;
              };

              return (
                <TableRow key={order.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      statusTokenBg(theme.color),
                      statusTokenText(theme.color)
                    )}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {order.status || "draft"}
                    </span>
                  </TableCell>

                  <TableCell className="min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", statusTokenText(theme.color))} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {order.number ?? generateFriendlyNumber(order.id, 'order')}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {getCompanyName(order.company_id)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {formatMoneyMinor(order.totalMinor || 0, order.currency || "DKK")}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(order.order_date)}
                    {order.order_date && order.created_at && " • "}
                    {order.created_at && formatDate(order.created_at)}
                    {isDueSoon(order.order_date) && (
                      <span className="ml-2 rounded-full bg-warning/10 text-warning px-2 py-0.5">Due soon</span>
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                // Import conversion function
                                const { ensureInvoiceForOrder } = await import("@/services/conversions");
                                await ensureInvoiceForOrder(order.id);

                                // Update order status to "invoiced" in the database
                                const { updateOrderHeader } = await import("@/services/orders");
                                await updateOrderHeader(order.id, { status: "invoiced" });

                                // Update status locally immediately
                                updateOrderStatusLocally(order.id, "invoiced");

                                toast({
                                  title: "Invoice Created",
                                  description: "Invoice has been created successfully.",
                                });

                                // Invalidate both orders and invoices queries
                                await Promise.all([
                                  refetch(),
                                  queryClient.invalidateQueries({ queryKey: qk.invoices() })
                                ]);
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to create invoice.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={order.status === "invoiced"}
                            aria-label="Convert to Invoice"
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {order.status === "invoiced" ? "Already invoiced" : "Convert to Invoice"}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGeneratePDF(order)}
                            aria-label="Open PDF"
                          >
                            <FileDown className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open PDF</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/orders/${order.id}`)}
                            aria-label="Open editor"
                          >
                            <FileSymlink className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open Editor</TooltipContent>
                      </Tooltip>


                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onOpenPdf={handleGeneratePDF}
              onOpenEditor={(order) => navigate(`/orders/${order.id}`)}
              onConvertToInvoice={async (order) => {
                try {
                  const { ensureInvoiceForOrder } = await import("@/services/conversions");
                  await ensureInvoiceForOrder(order.id);

                  // Update order status to "invoiced" in the database
                  const { updateOrderHeader } = await import("@/services/orders");
                  await updateOrderHeader(order.id, { status: "invoiced" });

                  // Update status locally immediately
                  updateOrderStatusLocally(order.id, "invoiced");

                  toast({
                    title: "Invoice Created",
                    description: "Invoice has been created successfully.",
                  });

                  // Invalidate both orders and invoices queries
                  await Promise.all([
                    refetch(),
                    queryClient.invalidateQueries({ queryKey: qk.invoices() })
                  ]);
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create invoice.",
                    variant: "destructive",
                  });
                }
              }}
            />
          ))}
        </div>
      )}

      <CreateOrderModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
};

export default Orders;

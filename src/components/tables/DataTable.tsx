import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Column {
  header: string;
  cell: (row: any) => React.ReactNode;
  accessorKey?: string;
  meta?: {
    align?: "start" | "center" | "end";
    sortable?: boolean;
  };
  mobileLabel?: string; // Optional label for mobile card view
  hideOnMobile?: boolean; // Hide this column on mobile
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  pageSize?: number;
  toolbar?: React.ReactNode;
  onRowClick?: (row: any) => void;
}

export function DataTable({ columns, data, pageSize = 20, toolbar, onRowClick }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const isMobile = useIsMobile();

  // Handle undefined data gracefully
  const safeData = data || [];
  
  // Sort data if sortColumn is set
  const sortedData = [...safeData].sort((a, b) => {
    if (!sortColumn) return 0;

    const column = columns.find(col => col.accessorKey === sortColumn);
    if (!column?.accessorKey) return 0;

    const aValue = a[column.accessorKey];
    const bValue = b[column.accessorKey];

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = sortedData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSort = (accessorKey: string) => {
    if (sortColumn === accessorKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(accessorKey);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Mobile card view
  if (isMobile) {
    const mobileColumns = columns.filter(col => !col.hideOnMobile);
    
    return (
      <div className="space-y-4">
        {toolbar && (
          <div className="flex items-center justify-between">
            {toolbar}
          </div>
        )}
        
        <div className="space-y-3">
          {currentData.map((row, rowIndex) => (
            <Card
              key={rowIndex}
              className={cn(
                "shadow-sm",
                onRowClick && "cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] touch-manipulation"
              )}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  {mobileColumns.map((column, colIndex) => (
                    <div
                      key={colIndex}
                      className="flex justify-between items-start gap-2"
                    >
                      <span className="text-xs text-muted-foreground font-medium min-w-[100px]">
                        {column.mobileLabel || column.header}
                      </span>
                      <div className="text-sm text-right flex-1">
                        {column.cell(row)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-center text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, safeData.length)} of {safeData.length}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="touch-manipulation"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-medium px-3 py-1 bg-muted rounded-md min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="touch-manipulation"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="rounded-2xl border bg-background shadow-card">
      {toolbar && (
        <div className="flex items-center justify-between border-b p-3">
          {toolbar}
        </div>
      )}

      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {(columns || []).map((column, index) => (
                <TableHead
                  key={index}
                  className={column.meta?.align === "end" ? "text-right" : ""}
                >
                  {column.accessorKey && column.meta?.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.accessorKey!)}
                      className="h-auto p-0 font-normal hover:bg-transparent"
                    >
                      {column.header}
                      {sortColumn === column.accessorKey ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      )}
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors"
                )}
              >
                {(columns || []).map((column, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={column.meta?.align === "end" ? "text-right" : ""}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="text-sm text-muted-foreground hidden md:block">
            Showing {startIndex + 1} to {Math.min(endIndex, safeData.length)} of {safeData.length} results
          </div>
          <div className="text-xs text-muted-foreground md:hidden">
            {startIndex + 1}-{Math.min(endIndex, safeData.length)} of {safeData.length}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="hidden md:flex"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="hidden md:flex"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

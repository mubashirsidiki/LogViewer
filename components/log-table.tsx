"use client";

import { useState, useRef, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface LogEntry {
  id: string | number;
  timestamp: string | number | Date;
  level: "INFO" | "DEBUG" | "WARN" | "ERROR" | string;
  message: string;
  service?: string;
  user?: string;
  component?: string;
  action?: string;
  statusCode?: number;
  requestId?: string;
  // Add any additional fields that can appear in `logs`
  [key: string]: unknown;
}

interface LogTableProps {
  logs: LogEntry[];
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function LogTable({ logs }: LogTableProps) {
  // -----------------------------
  // Table state
  // -----------------------------
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageSize, setPageSize] = useLocalStorage<number>(
    "logViewerPageSize",
    10,
  );
  const [columnSearchVisible, setColumnSearchVisible] =
    useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const searchInputRefs =
    useRef<Record<string, HTMLInputElement | null>>({});

  // -----------------------------
  // Effects
  // -----------------------------

  // When a column search input becomes visible, focus it automatically
  useEffect(() => {
    Object.entries(columnSearchVisible).forEach(([id, visible]) => {
      if (visible && searchInputRefs.current[id]) {
        // `setTimeout` allows the element to render first
        setTimeout(() => searchInputRefs.current[id]?.focus(), 0);
      }
    });
  }, [columnSearchVisible]);

  // Ensure table page size stays in‑sync with persisted `pageSize`
  const tablePageSize = Number(pageSize) || 10; // Fallback to 10 if parsing fails

  // -----------------------------
  // Column definitions
  // -----------------------------

  const buildTextColumn = (
    accessorKey: keyof LogEntry,
    headerLabel: string,
  ): ColumnDef<LogEntry> => ({
    accessorKey,
    header: ({ column }) => (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
          >
            {headerLabel}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent"
            onClick={() => toggleColumnSearch(accessorKey as string)}
          >
            <Search
              className={cn(
                "h-3.5 w-3.5",
                columnSearchVisible[accessorKey as string] && "text-primary",
              )}
            />
          </Button>
        </div>
        {columnSearchVisible[accessorKey as string] && (
          <div className="pt-1">
            <Input
              ref={(el) => {
                if (el) {
                  searchInputRefs.current[accessorKey as string] = el;
                }
              }}
              placeholder={`Search ${headerLabel.toLowerCase()}...`}
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        )}
      </div>
    ),
  });

  const columns: ColumnDef<LogEntry>[] = [
    buildTextColumn("id", "Id"),
    {
      accessorKey: "timestamp",
      header: buildTextColumn("timestamp", "Timestamp").header,
      cell: ({ row }) => {
        const timestamp = new Date(row.getValue("timestamp") as string | number);
        return (
          <div className="font-medium">
            {timestamp.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </div>
        );
      },
    },
    {
      accessorKey: "level",
      header: buildTextColumn("level", "Level").header,
      cell: ({ row }) => {
        const level = row.getValue("level") as LogEntry["level"];
        return (
          <Badge
            className={cn(
              "font-mono text-xs",
              level === "INFO" &&
                "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200",
              level === "DEBUG" &&
                "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-200",
              level === "WARN" &&
                "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200",
              level === "ERROR" &&
                "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-200",
            )}
          >
            {level}
          </Badge>
        );
      },
    },
    buildTextColumn("message", "Message"),
    buildTextColumn("service", "Service"),
    buildTextColumn("user", "User"),
    buildTextColumn("component", "Component"),
    buildTextColumn("action", "Action"),
    buildTextColumn("statusCode", "StatusCode"),
    buildTextColumn("requestId", "RequestId"),
    {
      id: "copy",
      header: () => <span className="sr-only">Copy</span>,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyRow(row.original)}
                className="h-6 w-6"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy row</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // -----------------------------
  // React‑Table instance
  // -----------------------------

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: tablePageSize,
      },
    },
  });

  // Keep React‑Table in‑sync when `pageSize` state changes
  useEffect(() => {
    table.setPageSize(tablePageSize);
  }, [table, tablePageSize]);

  // -----------------------------
  // Helpers
  // -----------------------------

  const toggleColumnSearch = (columnId: string) => {
    setColumnSearchVisible((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const hasActiveColumnSearch = Object.values(columnSearchVisible).some(Boolean);
  const hasActiveFilters = table.getState().columnFilters.length > 0;

  const clearAllFilters = () => {
    table.resetColumnFilters();
    setColumnSearchVisible({});
  };

  const { toast } = useToast();

  const copyRow = (entry: LogEntry) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(entry));
      toast({ title: "Copied", description: "Row copied to clipboard" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy row",
        variant: "destructive",
      });
    }
  };

  // -----------------------------
  // Render
  // -----------------------------

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* Top Bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter messages..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 border-2"
          />
        </div>

        <div className="flex items-center gap-2">
          {(hasActiveFilters || hasActiveColumnSearch) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="border-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Column Visibility Dropdown                                   */}
          {/* -------------------------------------------------------------- */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-2">
                <span className="mr-2">Columns</span>
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 border-2">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-medium">Toggle columns</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allVisible: Record<string, boolean> = {};
                      table.getAllLeafColumns().forEach((col) => {
                        allVisible[col.id] = true;
                      });
                      setColumnVisibility(allVisible);
                    }}
                    className="h-8 px-2 text-xs border"
                  >
                    Show All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setColumnVisibility({
                        id: true,
                        timestamp: true,
                        level: true,
                        message: true,
                        service: false,
                        user: false,
                        component: false,
                        action: false,
                        statusCode: false,
                        requestId: false,
                      });
                    }}
                    className="h-8 px-2 text-xs border"
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize border-b"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Active Filter Badges                                             */}
      {/* ------------------------------------------------------------------ */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 py-2">
          {table.getState().columnFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="outline"
              className="flex items-center gap-1 border-2"
            >
              {filter.id}: {filter.value as string}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-md border-2 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 border-b-2">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b-2"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="border-r-2 last:border-r-0">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "hover:bg-muted/50 border-b-2",
                      idx % 2 === 0 ? "bg-muted/30" : "bg-background",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="border-r-2 last:border-r-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select
            value={tablePageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px] border-2">
              <SelectValue placeholder={tablePageSize} />
            </SelectTrigger>
            <SelectContent className="border-2">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={size.toString()} className="border-b last:border-b-0">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Page</p>
            <strong className="text-sm">
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 border-2"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 border-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 border-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 border-2"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Custom Scrollbar Styles                                           */}
      {/* ------------------------------------------------------------------ */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: hsl(var(--muted));
        }
        ::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground));
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}

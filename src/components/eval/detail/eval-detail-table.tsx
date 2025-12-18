"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EvaluationResultItem } from "@/types/eval/index";
import { cn } from "lib/utils";

// Column configuration interface
interface Column {
  key: string;
  label: string;
  type?: "string" | "number" | "date" | "boolean";
}

// Table component props interface
export interface EvalDetailTableProps {
  title?: string;
  description?: string;
  results: EvaluationResultItem[];
}

// Sort direction type
type SortDirection = "asc" | "desc" | null;

// Lazy load XLSX library from CDN
const loadXLSX = async () => {
  if (typeof window === "undefined") {
    throw new Error("XLSX can only be loaded in browser environment");
  }

  // Check if XLSX is already loaded
  if ((window as any).XLSX) {
    return (window as any).XLSX;
  }

  // Load XLSX from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
      } else {
        reject(new Error("Failed to load XLSX library"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load XLSX script"));
    document.head.appendChild(script);
  });
};

export function EvalDetailTable({
  title,
  description,
  results,
}: EvalDetailTableProps) {
  const t = useTranslations("Eval");
  const router = useRouter();
  const displayTitle = title || t("table.resultsTitle");

  // Column configuration
  const columns: Column[] = [
    { key: "index", label: t("table.number"), type: "number" },
    { key: "input", label: t("table.input"), type: "string" },
    { key: "actualOutput", label: t("table.output"), type: "string" },
    { key: "executionTime", label: t("table.executionTime"), type: "number" },
    { key: "success", label: t("table.status"), type: "boolean" },
    { key: "actions", label: t("table.actions"), type: "string" },
  ];

  // Fixed settings for simplicity
  const pageSize = 10;
  const searchable = true;
  const exportable = true;

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((col) => col.key)),
  );

  // Helper function to format cell values based on column type
  const formatCellValue = (value: any, columnType: string = "string") => {
    if (value === null || value === undefined) return "";

    switch (columnType) {
      case "number":
        return typeof value === "number" ? value.toLocaleString() : value;
      case "boolean":
        return value ? t("table.success") : t("table.failed");
      case "date":
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }
      default:
        return String(value);
    }
  };

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = String(text).split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  // Process results data for display
  const processedData = useMemo(() => {
    // Add defensive check for undefined results
    if (!results || !Array.isArray(results)) {
      return [];
    }

    let processed = results.map((result, index) => ({
      ...result,
      index: index + 1,
      actions: result.id, // For action buttons
    }));

    // Apply global search
    if (searchTerm && searchable) {
      processed = processed.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // Apply sorting based on column type
    if (sortColumn && sortDirection) {
      processed.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        const column = columns.find((col) => col.key === sortColumn);
        const columnType = column?.type || "string";

        let comparison = 0;

        switch (columnType) {
          case "number":
            comparison = Number(aValue || 0) - Number(bValue || 0);
            break;
          case "date":
            comparison =
              new Date(aValue || 0).getTime() - new Date(bValue || 0).getTime();
            break;
          case "boolean":
            comparison = (aValue ? 1 : 0) - (bValue ? 1 : 0);
            break;
          default:
            comparison = String(aValue || "").localeCompare(
              String(bValue || ""),
            );
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return processed;
  }, [results, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages =
    pageSize > 0 ? Math.ceil(processedData.length / pageSize) : 1;
  const paginatedData =
    pageSize > 0
      ? processedData.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        )
      : processedData;

  // Handle sorting (all columns are sortable by default)
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : sortDirection === "desc"
            ? null
            : "asc",
      );
      if (sortDirection === "desc") {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const visibleCols = columns.filter((col) => visibleColumns.has(col.key));
    const csvContent = [
      // Header
      visibleCols
        .map((col) => col.label)
        .join(","),
      // Data rows
      ...processedData.map((row) =>
        visibleCols
          .map((col) => {
            if (col.key === "success") {
              return `"${row[col.key] ? t("table.success") : t("table.failed")}"`;
            }
            return `"${formatCellValue(row[col.key], col.type)}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${displayTitle.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel (lazy load XLSX library)
  const exportToExcel = async () => {
    try {
      // Dynamically load XLSX from CDN
      const XLSX = await loadXLSX();

      const visibleCols = columns.filter((col) => visibleColumns.has(col.key));

      // Prepare data for Excel
      const excelData = [
        // Header row
        visibleCols.map((col) => col.label),
        // Data rows
        ...processedData.map((row) =>
          visibleCols.map((col) => {
            const value = row[col.key];
            // Convert formatted values back to raw values for Excel
            switch (col.type) {
              case "number":
                return typeof value === "number"
                  ? value
                  : Number(value) || value;
              case "date":
                return value instanceof Date ? value : new Date(value);
              case "boolean":
                return typeof value === "boolean" ? value : value;
              default:
                return value;
            }
          }),
        ),
      ];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Auto-size columns
      const colWidths = visibleCols.map((col) => {
        const maxLength = Math.max(
          col.label.length,
          ...processedData.map(
            (row) =>
              String(formatCellValue(row[col.key], col.type) || "").length,
          ),
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

      // Save file
      XLSX.writeFile(workbook, `${displayTitle.replace(/\s+/g, "_")}.xlsx`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      // Fallback to CSV if Excel export fails
      exportToCSV();
    }
  };

  // Handle view process action
  const handleViewProcess = (resultId: string) => {
    router.push(`/eval-task/${resultId}`);
  };

  const visibleColumnsArray = columns.filter((col) =>
    visibleColumns.has(col.key),
  );

  return (
    <div className="px-6">
      <Card className="w-full px-0 bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-primary font-serif flex items-center gap-2">
            <div className="w-2 h-6 bg-gradient-to-b from-primary to-primary/80 rounded-full" />
            {displayTitle}
          </CardTitle>
          {description && (
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          )}

          {/* Search and Export */}
          <div className="flex items-center gap-2 mt-4">
            {searchable && (
              <div className="flex-1">
                <Input
                  placeholder={t("table.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="hover:bg-input bg-muted transition-colors border-border text-foreground placeholder:text-muted-foreground focus-visible:bg-accent"
                />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-primary hover:text-primary data-[state=open]:bg-accent"
                >
                  <Eye className="size-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border">
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.has(column.key)}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const newVisible = new Set(visibleColumns);
                      const checked = !newVisible.has(column.key);
                      if (checked) {
                        newVisible.add(column.key);
                      } else {
                        newVisible.delete(column.key);
                      }
                      setVisibleColumns(newVisible);
                    }}
                    className="text-zinc-200"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {exportable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-primary hover:text-primary data-[state=open]:bg-accent"
                  >
                    <Download className="size-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border-border">
                  <DropdownMenuItem
                    onClick={exportToCSV}
                    className="text-foreground hover:bg-accent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={exportToExcel}
                    className="text-foreground hover:bg-accent"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-0 relative">
          <Table className="border-separate border-spacing-y-1">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {visibleColumnsArray.map((column, index) => {
                  return (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "text-primary font-semibold py-4",
                        index === 0
                          ? "pl-6"
                          : index === visibleColumnsArray.length - 1
                            ? "pr-6"
                            : "",
                        column.type === "number" ||
                          column.type === "date" ||
                          column.type === "boolean"
                          ? "text-center"
                          : "",
                      )}
                    >
                      {/* Column header with sorting */}
                      <div
                        className={cn(
                          "flex items-center gap-2 cursor-pointer hover:text-foreground",
                          column.type === "number" || column.type === "date"
                            ? "justify-center"
                            : "",
                        )}
                        onClick={() => handleSort(column.key)}
                      >
                        <span>{column.label}</span>

                        <ArrowDownUp
                          className={cn(
                            "h-3 w-3",
                            sortColumn === column.key ? "" : "text-primary/50",
                          )}
                        />
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody className="min-h-[24rem]">
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnsArray.length}
                    className="text-center h-48 text-zinc-400"
                  >
                    {searchTerm
                      ? t("table.noResultsFound")
                      : t("detail.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => {
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-border bg-card hover:bg-accent/50 transition-colors duration-200",
                      )}
                    >
                      {visibleColumnsArray.map((column, index) => (
                        <TableCell
                          key={column.key}
                          className={cn(
                            "py-4",
                            index === 0
                              ? "pl-6"
                              : index === visibleColumnsArray.length - 1
                                ? "pr-6"
                                : "",
                            column.type === "number" || column.type === "date"
                              ? "text-center"
                              : column.type === "boolean"
                                ? "flex items-center justify-center"
                                : "",
                          )}
                        >
                          {column.key === "index" ? (
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-mono">
                                {row[column.key]}
                              </span>
                              <span className="font-mono text-zinc-400 text-xs">
                                #{row.id}
                              </span>
                            </div>
                          ) : column.key === "success" ? (
                            row[column.key] ? (
                              <div className="flex items-center justify-center gap-1 text-green-400">
                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                                <span className="text-xs">
                                  {t("table.success")}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-red-400">
                                <div className="w-2 h-2 bg-red-400 rounded-full" />
                                <span className="text-xs">
                                  {t("table.failed")}
                                </span>
                              </div>
                            )
                          ) : column.key === "actions" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProcess(row.id)}
                              className="text-primary hover:text-primary hover:bg-accent"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t("table.viewProcess")}
                            </Button>
                          ) : column.key === "input" ||
                            column.key === "actualOutput" ? (
                            <div className="max-w-md">
                              <p className="text-zinc-200 text-sm line-clamp-2">
                                {searchTerm && searchable
                                  ? highlightText(
                                      formatCellValue(
                                        row[column.key],
                                        column.type,
                                      ),
                                      searchTerm,
                                    )
                                  : formatCellValue(
                                      row[column.key],
                                      column.type,
                                    )}
                              </p>
                              {row.metrics && column.key === "input" && (
                                <div className="flex gap-2 mt-1">
                                  {Object.entries(row.metrics)
                                    .slice(0, 2)
                                    .map(([key, value]) => (
                                      <span
                                        key={key}
                                        className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded"
                                      >
                                        {key}: {String(value)}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : column.key === "executionTime" ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-primary font-mono font-semibold">
                                {formatCellValue(row[column.key], column.type)}
                              </span>
                              <span className="text-primary/60 text-xs">
                                ms
                              </span>
                            </div>
                          ) : searchTerm && searchable ? (
                            highlightText(
                              formatCellValue(row[column.key], column.type),
                              searchTerm,
                            )
                          ) : (
                            formatCellValue(row[column.key], column.type)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 px-6">
            <div className="text-xs text-zinc-400">
              Total rows: {results.length}
            </div>
            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="text-zinc-300 hover:text-zinc-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm px-2 text-zinc-300">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="text-zinc-300 hover:text-zinc-100"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

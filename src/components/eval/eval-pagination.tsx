"use client";

import { useTranslations } from "next-intl";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "lib/utils";
import { Button } from "ui/button";

interface EvalPaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export function EvalPagination({
  currentPage,
  setCurrentPage,
  totalPages = 5,
  hasNextPage = true,
  hasPreviousPage = false,
}: EvalPaginationProps) {
  const t = useTranslations("Eval");
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center space-x-2">
      {/* Previous Page Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => hasPreviousPage && setCurrentPage(currentPage - 1)}
        disabled={!hasPreviousPage}
        className="w-9 h-9 rounded-full"
        title={t("pagination.previous")}
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </Button>

      {/* Page Number Buttons */}
      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="icon"
          onClick={() => setCurrentPage(page)}
          className={cn(
            "w-9 h-9 rounded-full",
            currentPage === page && "bg-primary hover:bg-primary/90",
          )}
        >
          {page}
        </Button>
      ))}

      {/* Next Page Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => hasNextPage && setCurrentPage(currentPage + 1)}
        disabled={!hasNextPage}
        className="w-9 h-9 rounded-full"
        title={t("pagination.next")}
      >
        <ChevronRightIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}

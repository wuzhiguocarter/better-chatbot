"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { EvalCard } from "./eval-card";
import { EvalPagination } from "./eval-pagination";
import { CreateEvalDialog } from "./create-eval-dialog";
import { EvalFile } from "@/types/eval";
import { cn } from "lib/utils";
import { Button } from "ui/button";

interface EvalMainContentProps {
  files: EvalFile[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  onCreateEval: (title: string, description?: string) => void;
  onFileAction: (fileId: string, action: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRefresh: () => void;
}

export function EvalMainContent({
  files,
  loading,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  onCreateEval,
  onFileAction,
  onDeleteFile,
  onRefresh,
}: EvalMainContentProps) {
  const router = useRouter();
  const t = useTranslations("Eval");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <main className="flex-1 bg-background min-h-screen">
      <div className="w-full flex flex-col gap-4 p-8">
        {/* Page Title */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <Button variant="ghost" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            {t("createNew")}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/eval-task")}>
            <PlusIcon className="w-5 h-5 mr-2" />
            对话测试
          </Button>
        </div>

        {/* Search and Action Area */}
        <div className="flex items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCwIcon
              className={cn("w-5 h-5", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>

        {/* File Card Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-muted h-40 rounded-lg" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-muted-foreground text-lg mb-4">
              {searchQuery ? t("noResults") : t("noFiles")}
            </div>
            {!searchQuery && (
              <Button
                variant="ghost"
                onClick={() => setIsCreateDialogOpen(true)}
                className="text-primary hover:text-primary/90"
              >
                {t("createFirst")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <EvalCard
                key={file.id}
                file={file}
                onView={(id) => {
                  // Navigate to evaluation detail page
                  router.push(`/eval/${id}`);
                }}
                onAction={onFileAction}
                onDelete={onDeleteFile}
              />
            ))}
          </div>
        )}

        {/* Pagination Component */}
        {!loading && files.length > 0 && (
          <div className="mt-12">
            <EvalPagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}

        {/* Create Evaluation Dialog */}
        <CreateEvalDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateEval={onCreateEval}
        />
      </div>
    </main>
  );
}

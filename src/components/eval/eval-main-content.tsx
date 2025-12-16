"use client";

import { useState } from "react";
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
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">评估管理</h1>
          <Button variant="ghost" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            新建评估
          </Button>
        </div>

        {/* 搜索和操作区域 */}
        <div className="flex items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索评估文件..."
              className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* 刷新按钮 */}
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

        {/* 文件卡片网格 */}
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
              {searchQuery ? "未找到匹配的评估文件" : "暂无评估文件"}
            </div>
            {!searchQuery && (
              <Button
                variant="ghost"
                onClick={() => setIsCreateDialogOpen(true)}
                className="text-primary hover:text-primary/90"
              >
                立即创建第一个评估
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
                  // Handle view action
                  console.log("View file:", id);
                }}
                onAction={onFileAction}
                onDelete={onDeleteFile}
              />
            ))}
          </div>
        )}

        {/* 分页组件 */}
        {!loading && files.length > 0 && (
          <div className="mt-12">
            <EvalPagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}

        {/* 创建评估对话框 */}
        <CreateEvalDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateEval={onCreateEval}
        />
      </div>
    </main>
  );
}

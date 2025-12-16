"use client";

import useSWR from "swr";
import { fetcher } from "lib/utils";
import { EvaluationDetail } from "@/types/eval/index";
import { EvalDetailHeader } from "./eval-detail-header";
import { EvalInfoCards } from "./eval-info-cards";
import { EvalDetailTable } from "./eval-detail-table";
import { Skeleton } from "ui/skeleton";
import { Card, CardContent } from "ui/card";
import { AlertCircleIcon } from "lucide-react";

interface EvalDetailPageClientProps {
  evaluationId: string;
}

// Helper function to handle both legacy and new data structures
function getResultsData(evaluation: EvaluationDetail) {
  // Handle new structure: results is an object with detailed_results
  if (
    evaluation.results &&
    typeof evaluation.results === "object" &&
    "detailed_results" in evaluation.results
  ) {
    return evaluation.results.detailed_results;
  }

  // Handle legacy structure: results is a direct array (temporary backward compatibility)
  if (evaluation.results && Array.isArray(evaluation.results)) {
    return evaluation.results as any[];
  }

  return [];
}

function getResultsStats(evaluation: EvaluationDetail) {
  // Handle new structure
  if (
    evaluation.results &&
    typeof evaluation.results === "object" &&
    "total_samples" in evaluation.results
  ) {
    return {
      total: evaluation.results.total_samples,
      description: `共 ${evaluation.results.total_samples} 条评估结果，包含输入、输出、延迟等详细信息`,
    };
  }

  // Handle legacy structure
  if (evaluation.results && Array.isArray(evaluation.results)) {
    const resultsArray = evaluation.results as any[];
    return {
      total: resultsArray.length,
      description: `共 ${resultsArray.length} 条评估结果，包含输入、输出、延迟等详细信息`,
    };
  }

  return {
    total: 0,
    description: "暂无评估结果",
  };
}

export function EvalDetailPageClient({
  evaluationId,
}: EvalDetailPageClientProps) {
  const { data, error, isLoading } = useSWR<{ evaluation: EvaluationDetail }>(
    `/api/eval/${evaluationId}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  if (isLoading) {
    return <EvalDetailPageSkeleton />;
  }

  if (error || !data?.evaluation) {
    return (
      <main className="flex-1 bg-background min-h-screen text-foreground">
        <div className="w-full flex flex-col gap-4 p-8">
          <EvalDetailHeader title="加载失败" />
          <Card className="bg-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-destructive-foreground">
                <AlertCircleIcon className="h-5 w-5" />
                <span>无法加载评估详情，请稍后重试</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const evaluation = data.evaluation;

  // Get results data and stats using helper functions
  const resultsData = getResultsData(evaluation);
  const resultsStats = getResultsStats(evaluation);

  return (
    <main className="flex-1 bg-background min-h-screen text-foreground">
      <div className="w-full flex flex-col gap-4 p-8">
        {/* 页面头部 */}
        <EvalDetailHeader
          title={evaluation.title}
          status={evaluation.status}
          date={evaluation.date_created}
        />

        {/* 基础信息卡片 */}
        <EvalInfoCards evaluation={evaluation} />

        {/* 结果表格 */}
        {resultsData.length > 0 && (
          <EvalDetailTable
            results={resultsData}
            title="评估结果详情"
            description={resultsStats.description}
          />
        )}
      </div>
    </main>
  );
}

function EvalDetailPageSkeleton() {
  return (
    <main className="flex-1 bg-background min-h-screen text-foreground">
      <div className="w-full flex flex-col gap-4 p-8">
        {/* 头部骨架屏 */}
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-10 w-10 bg-muted rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 bg-muted" />
            <Skeleton className="h-4 w-4 bg-muted" />
            <Skeleton className="h-4 w-12 bg-muted" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-96 bg-muted" />
          <Skeleton className="h-6 w-20 bg-muted rounded-full" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-32 bg-muted" />
        </div>

        {/* 信息卡片骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-card border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2 bg-muted" />
                    <Skeleton className="h-8 w-16 bg-muted" />
                  </div>
                  <Skeleton className="h-14 w-14 rounded-xl bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 表格骨架屏 */}
        <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4 bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-4 w-8 bg-muted" />
                  <Skeleton className="h-4 flex-1 bg-muted" />
                  <Skeleton className="h-4 w-16 bg-muted" />
                  <Skeleton className="h-8 w-20 bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

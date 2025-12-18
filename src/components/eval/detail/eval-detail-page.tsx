"use client";

import { ReactNode } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "lib/utils";
import { EvaluationDetail } from "@/types/eval/index";
import { EvalInfoCards } from "./eval-info-cards";
import { EvalDetailTable } from "./eval-detail-table";
import { Skeleton } from "ui/skeleton";
import { Card, CardContent } from "ui/card";
import { AlertCircleIcon } from "lucide-react";

interface EvalDetailPageClientProps {
  evaluationId: string;
}

function EvalDetailLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full text-foreground">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        {children}
      </div>
    </div>
  );
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

function getResultsStats(evaluation: EvaluationDetail, t: any) {
  // Handle new structure
  if (
    evaluation.results &&
    typeof evaluation.results === "object" &&
    "total_samples" in evaluation.results
  ) {
    return {
      total: evaluation.results.total_samples,
      description: t("detail.resultsCount", {
        count: evaluation.results.total_samples,
      }),
    };
  }

  // Handle legacy structure
  if (evaluation.results && Array.isArray(evaluation.results)) {
    const resultsArray = evaluation.results as any[];
    return {
      total: resultsArray.length,
      description: t("detail.resultsCount", { count: resultsArray.length }),
    };
  }

  return {
    total: 0,
    description: t("detail.noResults"),
  };
}

export function EvalDetailPageClient({
  evaluationId,
}: EvalDetailPageClientProps) {
  const t = useTranslations("Eval");
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
      <EvalDetailLayoutShell>
        <div className="text-2xl font-bold text-foreground font-serif">
          {t("detail.loadFailed")}
        </div>
        <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive-foreground">
              <AlertCircleIcon className="h-5 w-5" />
              <span>{t("detail.loadFailedMessage")}</span>
            </div>
          </CardContent>
        </Card>
      </EvalDetailLayoutShell>
    );
  }

  const evaluation = data.evaluation;

  // Get results data and stats using helper functions
  const resultsData = getResultsData(evaluation);
  const resultsStats = getResultsStats(evaluation, t);

  return (
    <EvalDetailLayoutShell>
      {/* Info Cards */}
      <EvalInfoCards evaluation={evaluation} />

      {/* Results Table */}
      {resultsData.length > 0 && (
        <EvalDetailTable
          results={resultsData}
          title={t("detail.resultsTitle")}
          description={resultsStats.description}
        />
      )}
    </EvalDetailLayoutShell>
  );
}

function EvalDetailPageSkeleton() {
  return (
    <EvalDetailLayoutShell>
      {/* Info Cards Skeleton */}
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

      {/* Table Skeleton */}
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
    </EvalDetailLayoutShell>
  );
}

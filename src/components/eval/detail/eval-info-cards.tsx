"use client";

import { useTranslations } from "next-intl";
import { EvalMetricCard } from "./eval-metric-card";
import { EvaluationDetail } from "@/types/eval/index";

interface EvalInfoCardsProps {
  evaluation: EvaluationDetail;
}

export function EvalInfoCards({ evaluation }: EvalInfoCardsProps) {
  const t = useTranslations("Eval");

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("metrics.notSet");
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Helper function to format execution time
  const formatExecutionTime = (totalMs: number) => {
    if (totalMs < 1000) {
      return `${totalMs}ms`;
    } else if (totalMs < 60000) {
      return `${(totalMs / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(totalMs / 60000);
      const seconds = ((totalMs % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };

  // Calculate total execution time from results array
  const resultItems =
    evaluation.results && "detailed_results" in evaluation.results
      ? evaluation.results.detailed_results
      : [];

  const totalExecutionTime = resultItems.reduce(
    (total, result) => total + (result.executionTime || 0),
    0,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Dataset Size */}
      <EvalMetricCard
        title={t("metrics.datasetSize")}
        value={
          evaluation.configuration?.totalRows ||
          evaluation.results?.total_samples ||
          resultItems.length ||
          0
        }
        icon="file"
        description={t("metrics.datasetSizeDescription")}
      />

      {/* Created At */}
      <EvalMetricCard
        title={t("metrics.createdAt")}
        value={formatDate(evaluation.createdAt)}
        icon="clock"
        description={t("metrics.createdAtDescription")}
      />

      {/* Completed At */}
      <EvalMetricCard
        title={t("metrics.completedAt")}
        value={formatDate(evaluation.updatedAt)}
        icon="clock"
        description={t("metrics.completedAtDescription")}
      />

      {/* Total Execution Time */}
      <EvalMetricCard
        title={t("metrics.totalExecutionTime")}
        value={formatExecutionTime(totalExecutionTime)}
        icon="trend"
        description={t("metrics.totalExecutionTimeDescription")}
      />
    </div>
  );
}

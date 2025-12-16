"use client";

import { EvalMetricCard } from "./eval-metric-card";
import { EvaluationDetail } from "@/types/eval/index";

interface EvalInfoCardsProps {
  evaluation: EvaluationDetail;
}

// Helper function to format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return "未设置";
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

export function EvalInfoCards({ evaluation }: EvalInfoCardsProps) {
  // Calculate total execution time from results array
  const totalExecutionTime =
    evaluation.results?.reduce(
      (total, result) => total + (result.execution_time || 0),
      0,
    ) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 数据集大小 */}
      <EvalMetricCard
        title="数据集大小"
        value={
          evaluation.configuration?.dataset_size ||
          evaluation.results?.length ||
          0
        }
        icon="file"
        description="测试用例数量"
      />

      {/* 创建时间 */}
      <EvalMetricCard
        title="创建时间"
        value={formatDate(evaluation.date_created)}
        icon="clock"
        description="任务创建时间"
      />

      {/* 结束时间 */}
      <EvalMetricCard
        title="结束时间"
        value={formatDate(evaluation.date_completed)}
        icon="clock"
        description="任务完成时间"
      />

      {/* 总执行时间 */}
      <EvalMetricCard
        title="总执行时间"
        value={formatExecutionTime(totalExecutionTime)}
        icon="trend"
        description="所有测试用例总耗时"
      />
    </div>
  );
}

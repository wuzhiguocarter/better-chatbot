"use client";

import { Button } from "ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "lib/utils";
import { Separator } from "ui/separator";
import useSWR from "swr";

// Define fetcher function for SWR
async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

interface EvalDetailHeaderComponentProps {
  evaluationId: string;
}

export function EvalDetailHeaderComponent({
  evaluationId,
}: EvalDetailHeaderComponentProps) {
  const router = useRouter();
  const t = useTranslations("Eval");

  // 获取评测数据
  const { data } = useSWR(`/api/eval/${evaluationId}`, fetcher, {
    revalidateOnFocus: false,
  });

  const evaluation = data?.evaluation;

  const handleBack = () => {
    router.push("/eval");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        bg: "bg-secondary text-secondary-foreground",
        text: t("status.pending"),
      },
      running: {
        bg: "bg-chart-2 text-chart-2-foreground",
        text: t("status.running"),
      },
      completed: {
        bg: "bg-chart-1 text-chart-1-foreground",
        text: t("status.completed"),
      },
      failed: {
        bg: "bg-destructive text-destructive-foreground",
        text: t("status.failed"),
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
          config.bg,
        )}
      >
        {config.text}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="text-muted-foreground hover:text-foreground hover:bg-muted"
        aria-label={t("detail.backToEvaluations") || "Back to Evaluations"}
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("title")}</span>
        <span>/</span>
        <span className="text-foreground">{t("detail.pageTitle")}</span>
      </div>

      {evaluation && (
        <>
          <div className="w-1 h-4">
            <Separator orientation="vertical" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium truncate max-w-48">
              {evaluation.title}
            </span>
            {getStatusBadge(evaluation.status)}
          </div>
        </>
      )}
    </div>
  );
}

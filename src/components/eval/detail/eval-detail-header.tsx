import { Button } from "ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "lib/utils";

interface EvalDetailHeaderProps {
  title: string;
  status?: "pending" | "running" | "completed" | "failed";
  date?: string;
}

export function EvalDetailHeader({
  title,
  status,
  date,
}: EvalDetailHeaderProps) {
  const router = useRouter();
  const t = useTranslations("Eval");

  const handleBack = () => {
    router.push("/eval");
  };

  const getStatusBadge = () => {
    if (!status) return null;

    const statusConfig = {
      pending: {
        text: t("status.pending"),
        className: "bg-secondary text-secondary-foreground",
      },
      running: {
        text: t("status.running"),
        className: "bg-chart-2 text-chart-2-foreground",
      },
      completed: {
        text: t("status.completed"),
        className: "bg-chart-1 text-chart-1-foreground",
      },
      failed: {
        text: t("status.failed"),
        className: "bg-destructive text-destructive-foreground",
      },
    };

    const config = statusConfig[status];
    return (
      <span
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          config.className,
        )}
      >
        {config.text}
      </span>
    );
  };

  return (
    <div className="mb-8">
      {/* Breadcrumb navigation and back button */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("title")}</span>
          <span>/</span>
          <span className="text-foreground">{t("detail.pageTitle")}</span>
        </div>
      </div>

      {/* Page title and status */}
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground font-serif">
          {title}
        </h1>

        {getStatusBadge()}

        <div className="flex-1" />

        {date && (
          <div className="text-sm text-muted-foreground">
            {t("detail.createdAt")}: {date}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Button } from "ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "lib/utils";

interface EvalTaskBackButtonProps {
  className?: string;
}

export function EvalTaskBackButton({ className }: EvalTaskBackButtonProps) {
  const router = useRouter();
  const t = useTranslations("Eval");

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          className,
        )}
        aria-label={t("task.backToPrevious") || "Back to previous page"}
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("title")}</span>
        <span>/</span>
        <span className="text-foreground">{t("task.pageTitle")}</span>
      </div>
    </div>
  );
}

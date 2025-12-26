"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface FollowUpQuestionsPartProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export function FollowUpQuestionsPart({
  questions,
  onQuestionClick,
}: FollowUpQuestionsPartProps) {
  const t = useTranslations("Chat");

  if (questions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mt-4 fade-in animate-in">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("FollowUpQuestions.title")}
      </span>
      <div className="flex flex-col gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className={cn(
              "group relative w-full text-left p-3 text-sm rounded-lg",
              "bg-muted/50 hover:bg-secondary hover:ring-1 hover:ring-primary/50",
              "transition-all duration-200",
              "border border-transparent hover:border-primary/20",
            )}
          >
            <span className="relative z-10">{question}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  toggleMessageFeedbackAction,
  getMessageFeedbackAction,
} from "@/app/api/chat/actions";

type FeedbackType = "upvote" | "downvote" | null;

interface MessageFeedbackButtonsProps {
  messageId: string;
  readonly?: boolean;
}

export function MessageFeedbackButtons({
  messageId,
  readonly = false,
}: MessageFeedbackButtonsProps) {
  const t = useTranslations();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadFeedback() {
      try {
        const feedback = await getMessageFeedbackAction({ messageId });
        setFeedbackType(feedback);
      } catch (error) {
        console.error("Failed to load feedback:", error);
      }
    }
    loadFeedback();
  }, [messageId]);

  const handleFeedback = useCallback(
    async (type: "upvote" | "downvote") => {
      if (readonly || isLoading) return;

      setIsLoading(true);
      try {
        const result = await toggleMessageFeedbackAction({
          messageId,
          feedbackType: type,
        });
        setFeedbackType(result);
      } catch (error) {
        console.error("Failed to toggle feedback:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to submit feedback",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messageId, readonly, isLoading],
  );

  if (readonly) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground data-[active=true]:text-green-500 data-[active=true]:bg-green-500/10"
            data-active={feedbackType === "upvote"}
            disabled={isLoading}
            onClick={() => handleFeedback("upvote")}
          >
            {isLoading && feedbackType === null ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ThumbsUp className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t(
            feedbackType === "upvote"
              ? "Chat.Thread.MessageFeedback.liked"
              : "Chat.Thread.MessageFeedback.like",
          )}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground data-[active=true]:text-destructive data-[active=true]:bg-destructive/10"
            data-active={feedbackType === "downvote"}
            disabled={isLoading}
            onClick={() => handleFeedback("downvote")}
          >
            {isLoading && feedbackType === null ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ThumbsDown className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t(
            feedbackType === "downvote"
              ? "Chat.Thread.MessageFeedback.disliked"
              : "Chat.Thread.MessageFeedback.dislike",
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

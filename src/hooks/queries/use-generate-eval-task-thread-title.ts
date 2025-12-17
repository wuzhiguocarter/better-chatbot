"use client";

import { appStore } from "@/app/store";
import { useCompletion } from "@ai-sdk/react";
import { ChatModel } from "app-types/chat";
import { useCallback } from "react";
import { mutate as swrMutate } from "swr";
import { useShallow } from "zustand/shallow";

type UseEvalTaskGenerateThreadTitleOptions = {
  threadId: string;
  chatModel?: ChatModel;
};

export function useEvalTaskGenerateThreadTitle(
  options: UseEvalTaskGenerateThreadTitleOptions,
) {
  const [storeMutate, appStoreChatModel] = appStore(
    useShallow((state) => [state.mutate, state.chatModel]),
  );

  const finalModel = options.chatModel ?? appStoreChatModel;
  const { threadId } = options;

  const { complete, isLoading } = useCompletion({
    api: "/api/eval/task_chat/title",
  });

  const generateTitle = useCallback(
    async (message: string) => {
      if (!threadId) return;

      storeMutate((prev) => ({
        generatingEvalTaskTitleThreadIds: Array.from(
          new Set([...prev.generatingEvalTaskTitleThreadIds, threadId]),
        ),
      }));

      try {
        await complete(message, {
          body: {
            chatModel: finalModel,
            threadId,
          },
        });

        swrMutate("/api/eval/task_thread");
      } finally {
        storeMutate((prev) => ({
          generatingEvalTaskTitleThreadIds:
            prev.generatingEvalTaskTitleThreadIds.filter(
              (id) => id !== threadId,
            ),
        }));
      }
    },
    [threadId, storeMutate, complete, finalModel],
  );

  return {
    generateTitle,
    isLoading,
  };
}

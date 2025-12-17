"use client";

import { appStore } from "@/app/store";
import PromptInput from "@/components/prompt-input";
import { useEvalTaskGenerateThreadTitle } from "@/hooks/queries/use-generate-eval-task-thread-title";
import { useEvalTaskThreadList } from "@/hooks/queries/use-eval-task-thread-list";
import { useToRef } from "@/hooks/use-latest";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  TextUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import {
  ChatApiSchemaRequestBody,
  ChatAttachment,
  ChatModel,
} from "app-types/chat";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateUUID, truncateString } from "lib/utils";
import { useShallow } from "zustand/shallow";
import { ErrorMessage, PreviewMessage } from "./message";
import { toast } from "sonner";
import { mutate } from "swr";

type Props = {
  threadId: string;
  initialMessages: UIMessage[];
  model?: ChatModel;
  toolChoice?: any;
  allowedAppDefaultToolkit?: string[];
  allowedMcpServers?: Record<string, any>;
  threadList?: any[];
  threadMentions?: Record<string, any[]>;
  threadImageToolModel?: Record<string, any>;
};

export function EvalTaskChatBot({
  threadId,
  initialMessages,
  model,
  toolChoice,
  allowedAppDefaultToolkit,
  allowedMcpServers,
  threadList,
  threadMentions,
  threadImageToolModel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  // 主动获取评估任务线程列表
  useEvalTaskThreadList();

  // Get values from app store as fallback if not provided as props
  const [
    _appStoreMutate,
    appStoreModel,
    appStoreToolChoice,
    appStoreAllowedAppDefaultToolkit,
    appStoreAllowedMcpServers,
    appStoreThreadList,
    appStoreThreadMentions,
    appStoreThreadImageToolModel,
  ] = appStore(
    useShallow((state) => [
      state.mutate,
      state.chatModel,
      state.toolChoice,
      state.allowedAppDefaultToolkit,
      state.allowedMcpServers,
      state.threadList,
      state.threadMentions,
      state.threadImageToolModel,
    ]),
  );

  // Use props if provided, otherwise use app store values
  const finalModel = model ?? appStoreModel;
  const finalToolChoice = toolChoice ?? appStoreToolChoice;
  const finalAllowedAppDefaultToolkit =
    allowedAppDefaultToolkit ?? appStoreAllowedAppDefaultToolkit;
  const finalAllowedMcpServers = allowedMcpServers ?? appStoreAllowedMcpServers;
  const finalThreadList = threadList ?? appStoreThreadList;
  const finalThreadMentions = threadMentions ?? appStoreThreadMentions;
  const finalThreadImageToolModel =
    threadImageToolModel ?? appStoreThreadImageToolModel;

  const generateTitle = useEvalTaskGenerateThreadTitle({
    threadId,
  });

  const mentions = finalThreadMentions[threadId] ?? [];

  const latestRef = useToRef({
    model: finalModel,
    toolChoice: finalToolChoice,
    allowedAppDefaultToolkit: finalAllowedAppDefaultToolkit,
    allowedMcpServers: finalAllowedMcpServers,
    mentions,
    threadImageToolModel: finalThreadImageToolModel,
    threadList: finalThreadList,
    messages: initialMessages,
  });

  const onFinish = useCallback(() => {
    const messages = latestRef.current.messages;
    const prevThread = latestRef.current.threadList.find(
      (v) => v.id === threadId,
    );

    const isNewThread =
      !prevThread?.title &&
      messages.filter((v) => v.role === "user" || v.role === "assistant")
        .length < 3;

    if (isNewThread) {
      const part = messages
        .slice(0, 2)
        .flatMap((m) =>
          m.parts
            .filter((v) => v.type === "text")
            .map(
              (p) =>
                `${m.role}: ${truncateString((p as TextUIPart).text, 500)}`,
            ),
        );
      if (part.length > 0) {
        generateTitle(part.join("\n\n"));
      }
    } else if (latestRef.current.threadList[0]?.id !== threadId) {
      mutate("/api/eval/task_thread");
    }
  }, [threadId, generateTitle, latestRef]);

  const {
    messages,
    status,
    setMessages,
    addToolResult: _addToolResult,
    error,
    sendMessage,
    stop,
  } = useChat({
    id: threadId,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new DefaultChatTransport({
      api: "/api/eval/task_chat",
      prepareSendMessagesRequest: ({ messages, body, id }) => {
        if (window.location.pathname !== `/eval-task/${threadId}`) {
          window.history.replaceState({}, "", `/eval-task/${threadId}`);
        }

        const lastMessage = messages.at(-1)!;
        const attachments: ChatAttachment[] = lastMessage.parts.reduce(
          (acc: ChatAttachment[], part: any) => {
            if (part?.type === "file") {
              acc.push({
                type: "file",
                url: part.url,
                mediaType: part.mediaType,
                filename: part.filename,
              });
            } else if (part?.type === "source-url") {
              acc.push({
                type: "source-url",
                url: part.url,
                mediaType: part.mediaType,
                filename: part.title,
              });
            }
            return acc;
          },
          [],
        );

        const sanitizedLastMessage = {
          ...lastMessage,
          parts: lastMessage.parts.filter((p: any) => p?.type !== "source-url"),
        } as typeof lastMessage;

        const hasFilePart = lastMessage.parts?.some(
          (p: any) => p?.type === "file",
        );

        const requestBody: ChatApiSchemaRequestBody = {
          ...body,
          id,
          chatModel:
            (body as { model: ChatModel })?.model ?? latestRef.current.model,
          toolChoice: latestRef.current.toolChoice,
          allowedAppDefaultToolkit:
            latestRef.current.mentions?.length || hasFilePart
              ? []
              : latestRef.current.allowedAppDefaultToolkit,
          allowedMcpServers: latestRef.current.mentions?.length
            ? {}
            : latestRef.current.allowedMcpServers,
          mentions: latestRef.current.mentions,
          message: sanitizedLastMessage,
          imageTool: {
            model: latestRef.current.threadImageToolModel[threadId],
          },
          attachments,
        };
        return { body: requestBody };
      },
    }),
    messages: initialMessages,
    generateId: generateUUID,
    experimental_throttle: 100,
    onFinish,
    onError(err) {
      toast.error(err.message);
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  useEffect(() => {
    latestRef.current.messages = messages;
    latestRef.current.threadList = threadList;
  }, [messages, threadList, latestRef]);

  const addToolResult = useCallback(
    async (result: Parameters<typeof _addToolResult>[0]) => {
      await _addToolResult(result);
    },
    [_addToolResult],
  );

  const isLoading = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
      >
        {messages.map((message, index) => {
          const isLastMessage = messages.length - 1 === index;
          return (
            <PreviewMessage
              key={message.id ?? index}
              threadId={threadId}
              messageIndex={index}
              prevMessage={messages[index - 1]}
              message={message}
              status={status}
              addToolResult={addToolResult}
              isLoading={isLoading}
              isLastMessage={isLastMessage}
              setMessages={setMessages}
              sendMessage={sendMessage}
            />
          );
        })}
        {error && <ErrorMessage error={error} />}
      </div>
      <div className="border-t bg-background px-4 py-3">
        <PromptInput
          threadId={threadId}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          onStop={stop}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EvalMainContent } from "./eval-main-content";
import { EvalFile } from "@/types/eval";
import {
  EvaluationConfiguration,
  EvalTaskChatConfig,
} from "@/types/eval/index";
import { ChatAttachment, ChatMention, ChatModel } from "@/types/chat";
import {
  appStore,
  useSetThreadEvalTaskMentions,
  useThreadEvalTaskMentions,
} from "@/app/store";
import { toast } from "sonner";
import { EvalTaskConfigDialog } from "./eval-task-config-dialog";
import { useShallow } from "zustand/shallow";

type EvalStartPayload = {
  action: "start";
  configuration: EvaluationConfiguration;
  chatConfig: EvalTaskChatConfig;
};

type EvalStartOptions = {
  model?: ChatModel;
  agentId?: string;
  mentions?: ChatMention[];
  toolChoice?: "auto";
};

export function EvalPageClient() {
  const [files, setFiles] = useState<EvalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageLimit, setPageLimit] = useState(9);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);

  const [chatModel, appStoreMutate] = appStore(
    useShallow((state) => [state.chatModel, state.mutate]),
  );

  const setThreadEvalTaskMentions = useSetThreadEvalTaskMentions();
  const evalMentions = useThreadEvalTaskMentions(
    pendingFileId ?? "eval-task-default",
  );
  const defaultAgentId = useMemo(() => {
    const agentMention = evalMentions.find(
      (mention) => mention.type === "agent",
    ) as Extract<ChatMention, { type: "agent" }> | undefined;
    return agentMention?.agentId;
  }, [evalMentions]);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/eval?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch evaluation files");
      }

      const data = await response.json();

      setFiles(data.files ?? []);
      setTotalCount(Number(data.total ?? data.files?.length ?? 0));
      if (data.limit) {
        setPageLimit(Number(data.limit));
      }
    } catch (error) {
      console.error("Failed to fetch evaluation files:", error);
      toast.error("获取评测列表失败");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageLimit, searchQuery]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleCreateEval = async (
    title: string,
    description: string,
    file: File | null,
  ) => {
    if (!title.trim()) {
      toast.error("标题不能为空");
      throw new Error("Title is required");
    }

    if (!file) {
      toast.error("请先选择一个 CSV / Excel 文件");
      throw new Error("File is required");
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        toast.error("文件上传失败");
        throw new Error("Upload failed");
      }

      const uploadData = await uploadRes.json();
      const { key, url } = uploadData;

      if (!key || !url) {
        toast.error("文件上传响应异常");
        throw new Error("Invalid upload response");
      }

      const response = await fetch("/api/eval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storageKey: key,
          fileUrl: url,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        toast.error(errorBody.error || "创建评测任务失败");
        throw new Error(errorBody.error || "Failed to create evaluation");
      }

      await fetchFiles();
      toast.success("评测任务创建成功");
    } catch (error) {
      console.error("Failed to create evaluation:", error);
      throw error;
    }
  };

  const handleFileAction = async (
    fileId: string,
    action: string,
    options: EvalStartOptions = {},
  ) => {
    try {
      let payload: EvalStartPayload | { action: string } = { action };

      if (action === "start") {
        const detailResponse = await fetch(`/api/eval/${fileId}`);
        if (!detailResponse.ok) {
          toast.error("无法获取评测配置");
          return;
        }

        const detailData = await detailResponse.json();
        const configuration: EvaluationConfiguration | null =
          detailData?.evaluation?.configuration ?? null;

        if (!configuration) {
          toast.error("缺少评测配置");
          return;
        }

        const {
          chatModel,
          toolChoice,
          allowedAppDefaultToolkit,
          allowedMcpServers,
          threadImageToolModel,
          threadEvalTaskMentions,
        } = appStore.getState();

        const selectedModel = options.model ?? chatModel;

        if (!selectedModel) {
          toast.error("请先选择模型");
          return;
        }

        const mentions: ChatMention[] =
          options.mentions ??
          threadEvalTaskMentions[fileId] ??
          threadEvalTaskMentions["eval-task-default"] ??
          [];
        const imageToolModel =
          threadImageToolModel[fileId] ??
          threadImageToolModel["eval-task-default"];
        const allowedToolkit = mentions?.length
          ? []
          : (allowedAppDefaultToolkit ?? []);

        const chatConfig: EvalTaskChatConfig = {
          chatModel: selectedModel,
          toolChoice: options.toolChoice ?? toolChoice,
          allowedAppDefaultToolkit: allowedToolkit,
          allowedMcpServers: allowedMcpServers ?? {},
          mentions,
          imageToolModel,
          attachments: [] as ChatAttachment[],
        };

        payload = {
          action: "start",
          configuration: {
            ...configuration,
            rawConfig: {
              ...(configuration.rawConfig ?? {}),
              chatConfig,
            },
          },
          chatConfig,
        } satisfies EvalStartPayload;
      }

      const response = await fetch(`/api/eval/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchFiles(); // Refresh the list
      } else {
        const errorBody = await response.json().catch(() => ({}));
        toast.error(errorBody.error || "操作失败");
      }
    } catch (error) {
      console.error("Failed to update file:", error);
      toast.error("操作失败，请稍后再试");
    }
  };

  const handleStartWithConfig = (fileId: string, action: string) => {
    if (action === "start") {
      setPendingFileId(fileId);
      setConfigDialogOpen(true);
      return;
    }
    handleFileAction(fileId, action);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!fileId) return;

    setDeletingId(fileId);

    try {
      const response = await fetch(`/api/eval/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to delete evaluation file");
      }

      await fetchFiles();
      toast.success("删除成功");
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("删除失败，请稍后再试");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = useMemo(() => {
    if (!totalCount || !pageLimit) return 1;
    return Math.max(1, Math.ceil(totalCount / pageLimit));
  }, [pageLimit, totalCount]);

  return (
    <>
      <EvalMainContent
        files={files}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        hasNextPage={currentPage < totalPages}
        hasPreviousPage={currentPage > 1}
        onCreateEval={handleCreateEval}
        onFileAction={handleStartWithConfig}
        onDeleteFile={handleDeleteFile}
        onRefresh={fetchFiles}
        deletingId={deletingId}
      />

      <EvalTaskConfigDialog
        open={configDialogOpen}
        onOpenChange={(open) => {
          setConfigDialogOpen(open);
          if (!open) {
            setPendingFileId(null);
          }
        }}
        threadId={pendingFileId ?? "eval-task-default"}
        defaultModel={chatModel}
        defaultAgentId={defaultAgentId}
        defaultMentions={evalMentions}
        onConfirm={({ model, mentions, agentId, toolChoice }) => {
          if (!pendingFileId) return;
          setThreadEvalTaskMentions(pendingFileId, mentions);
          appStoreMutate({ chatModel: model, toolChoice });
          handleFileAction(pendingFileId, "start", {
            model,
            agentId,
            mentions,
            toolChoice,
          });
          setConfigDialogOpen(false);
          setPendingFileId(null);
        }}
      />
    </>
  );
}

import "server-only";

import type { ChatApiSchemaRequestBody } from "app-types/chat";
import {
  EvaluationConfiguration,
  EvalTaskChatConfig,
  EvalTaskChatConfigZod,
  EvaluationMetrics,
} from "@/types/eval/index";
import {
  evalConfigurationRepository,
  evalFileRepository,
  evalResultRepository,
} from "lib/db/repository";
import { generateUUID } from "lib/utils";
import logger from "logger";
import { headers } from "next/headers";

export async function startEvalJobInBackground(params: {
  fileId: string;
  userId: string;
}) {
  void runEvalJob(params).catch((error) => {
    logger.error("[eval-scheduler] failed to start job", error);
  });
}

async function runEvalJob({
  fileId,
  userId,
}: { fileId: string; userId: string }) {
  try {
    const h = await headers();

    const configuration = await evalConfigurationRepository.getByFileId(fileId);

    if (!configuration) {
      await evalFileRepository.updateStatus({ id: fileId, status: "failed" });
      throw new Error(`Evaluation configuration not found for file ${fileId}`);
    }

    const chatConfig = extractChatConfig(configuration);
    const results = await evalResultRepository.listByFileId(fileId);
    const pendingResults = results.filter((result) => result.success !== true);

    if (pendingResults.length === 0) {
      await evalFileRepository.updateStatus({
        id: fileId,
        status: "completed",
      });
      return;
    }

    await evalFileRepository.updateStatus({ id: fileId, status: "running" });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_ORIGIN ??
      "http://localhost:3000";

    let hasError = false;

    for (const result of pendingResults) {
      const startedAt = Date.now();
      try {
        const body = buildChatApiRequestBodyFromRow({
          chatConfig,
          input: result.input,
          threadId: result.id,
        });

        const { output, usage } = await runSingleEvaluation({
          baseUrl,
          body,
          sessionToken: h.get("cookie") ?? "",
          userId,
        });

        const metrics: EvaluationMetrics = {
          tokens: {
            prompt: usage?.promptTokens,
            completion: usage?.completionTokens,
            total: usage?.totalTokens,
          },
          durationMs: Date.now() - startedAt,
        };

        await evalResultRepository.updateById(result.id, {
          actualOutput: output,
          success: true,
          metrics,
        });
      } catch (error: any) {
        hasError = true;
        const durationMs = Date.now() - startedAt;
        await evalResultRepository.updateById(result.id, {
          success: false,
          metrics: {
            durationMs,
            error: error?.message ?? String(error),
          },
        });
      }
    }

    await evalFileRepository.updateStatus({
      id: fileId,
      status: hasError ? "failed" : "completed",
    });
  } catch (error) {
    await evalFileRepository.updateStatus({ id: fileId, status: "failed" });
    throw error;
  }
}

function extractChatConfig(
  configuration: EvaluationConfiguration,
): EvalTaskChatConfig {
  const raw = (configuration.rawConfig ?? {}) as { chatConfig?: unknown };
  const parsed = EvalTaskChatConfigZod.parse(raw.chatConfig);
  return parsed;
}

async function runSingleEvaluation(params: {
  baseUrl: string;
  body: ChatApiSchemaRequestBody;
  sessionToken: string;
  userId: string;
}) {
  const { baseUrl, body, sessionToken, userId } = params;

  const response = await fetch(`${baseUrl}/api/eval/task_chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-eval-user": userId,
      cookie: sessionToken,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(
      `task_chat request failed: ${response.status} ${errorText}`.trim(),
    );
  }

  const { output, usage } = await readEvalStream(response);

  return {
    output,
    usage,
  };
}

function buildChatApiRequestBodyFromRow(params: {
  chatConfig: EvalTaskChatConfig;
  input: string;
  threadId: string;
}): ChatApiSchemaRequestBody {
  const { chatConfig, input, threadId } = params;
  const attachments = chatConfig.attachments ?? [];
  const hasFilePart = attachments.some(
    (attachment) => attachment.type === "file",
  );

  return {
    id: threadId,
    chatModel: chatConfig.chatModel,
    toolChoice: chatConfig.toolChoice,
    allowedAppDefaultToolkit:
      chatConfig.mentions?.length || hasFilePart
        ? []
        : chatConfig.allowedAppDefaultToolkit,
    allowedMcpServers: chatConfig.mentions?.length
      ? {}
      : chatConfig.allowedMcpServers,
    mentions: chatConfig.mentions,
    imageTool: chatConfig.imageToolModel
      ? { model: chatConfig.imageToolModel }
      : undefined,
    attachments,
    message: {
      id: generateUUID(),
      role: "user",
      parts: [
        {
          type: "text",
          text: input,
        },
      ],
    },
  } satisfies ChatApiSchemaRequestBody;
}

async function readEvalStream(response: Response) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let output = "";
  let usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } = {};
  let buffer = "";

  // {"type":"start","messageId":"18483285-8068-4c66-99ed-80613760f44c"}
  // {"type":"start-step"}
  // {"type":"reasoning-start","id":"reasoning-0"}
  // {"type":"reasoning-delta","id":"reasoning-0","delta":"\n"}
  // {"type":"text-start","id":"txt-0"}
  // {"type":"text-delta","id":"txt-0","delta":"你好，dmeck！有什么我可以帮助你的吗？"}
  // {"type":"reasoning-end","id":"reasoning-0"}
  // {"type":"text-end","id":"txt-0"}
  // {"type":"finish-step"}
  // {"type":"finish","finishReason":"stop","messageMetadata":{"toolChoice":"auto","toolCount":6,"chatModel":{"provider":"openroute","model":"tngtech/deepseek-r1t2-chimera:free"},"usage":{"inputTokens":1639,"outputTokens":95,"totalTokens":1734,"reasoningTokens":144,"cachedInputTokens":3}}}
  // [DONE]
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const lines = event
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s*/, ""));

      if (dataLines.length === 0) continue;

      const payload = dataLines.join("\n");
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);
        output += extractTextFromStreamPayload(parsed);
        usage = extractUsageFromStreamPayload(parsed) ?? usage;
      } catch (error) {
        logger.warn("[eval-scheduler] failed to parse stream chunk", error);
      }
    }
  }

  return {
    output: output.trim(),
    usage,
  };
}

function extractTextFromStreamPayload(payload: any): string {
  if (!payload) return "";

  // Only extract text from "text-delta" type messages
  if (payload.type === "text-delta" && typeof payload.delta === "string") {
    return payload.delta;
  }

  return "";
}

function extractUsageFromStreamPayload(payload: any) {
  if (!payload) return undefined;

  // Handle finish type chunks with usage in messageMetadata
  if (payload.type === "finish" && payload.messageMetadata?.usage) {
    const usage = payload.messageMetadata.usage;
    return {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      reasoningTokens: usage.reasoningTokens,
      cachedInputTokens: usage.cachedInputTokens,
    };
  }

  return undefined;
}

export { runEvalJob };

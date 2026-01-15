import { after } from "next/server";

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  Tool,
  UIMessage,
} from "ai";

import {
  startActiveObservation,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

// Langfuse 懒加载
let langfuseSpanProcessor: any = null;
let langfuseInitPromise: Promise<void> | null = null;

function ensureLangfuse() {
  if (
    !langfuseInitPromise &&
    process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_SECRET_KEY
  ) {
    langfuseInitPromise = (async () => {
      try {
        const { LangfuseSpanProcessor } = await import("@langfuse/otel");
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );

        langfuseSpanProcessor = new LangfuseSpanProcessor({
          publicKey: process.env.LANGFUSE_PUBLIC_KEY,
          secretKey: process.env.LANGFUSE_SECRET_KEY,
          baseUrl:
            process.env.LANGFUSE_BASE_URL || "https://us.cloud.langfuse.com",
          shouldExportSpan: () => true,
        });

        const tracerProvider = new NodeTracerProvider({
          spanProcessors: [langfuseSpanProcessor],
        });

        tracerProvider.register();
        console.log("[chat] Langfuse initialized");
      } catch (e) {
        console.error("[chat] Langfuse init failed:", e);
      }
    })();
  }
  return langfuseInitPromise;
}

import { agentRepository, chatRepository } from "lib/db/repository";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import {
  chatApiSchemaRequestBodySchema,
  ChatMention,
  ChatMetadata,
} from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  filterMcpServerCustomizations,
  loadMcpTools,
  loadTaskTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
  parseFollowUpQuestions,
  stripFollowUpQuestionsTags,
} from "./shared.chat";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { VercelAITaskToolStreamingResultTag } from "app-types/task";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { nanoBananaTool, openaiImageTool } from "lib/ai/tools/image";
import { ImageToolName } from "lib/ai/tools";
import { buildCsvIngestionPreviewParts } from "@/lib/ai/ingest/csv-ingest";
import { serverFileStorage } from "lib/file-storage";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

export async function POST(request: Request) {
  // 确保 Langfuse 已初始化
  ensureLangfuse();

  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const userId = session.user.id;
    const {
      id,
      message,
      chatModel,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      imageTool,
      mentions = [],
      attachments = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await chatRepository.insertThread({
        id,
        title: "",
        userId,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    if (thread!.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    const ingestionPreviewParts = await buildCsvIngestionPreviewParts(
      attachments,
      (key) => serverFileStorage.download(key),
    );
    if (ingestionPreviewParts.length) {
      const baseParts = [...message.parts];
      let insertionIndex = -1;
      for (let i = baseParts.length - 1; i >= 0; i -= 1) {
        if (baseParts[i]?.type === "text") {
          insertionIndex = i;
          break;
        }
      }
      if (insertionIndex !== -1) {
        baseParts.splice(insertionIndex, 0, ...ingestionPreviewParts);
        message.parts = baseParts;
      } else {
        message.parts = [...baseParts, ...ingestionPreviewParts];
      }
    }

    if (attachments.length) {
      const firstTextIndex = message.parts.findIndex(
        (part: any) => part?.type === "text",
      );
      const attachmentParts: any[] = [];

      attachments.forEach((attachment) => {
        const exists = message.parts.some(
          (part: any) =>
            part?.type === attachment.type && part?.url === attachment.url,
        );
        if (exists) return;

        if (attachment.type === "file") {
          attachmentParts.push({
            type: "file",
            url: attachment.url,
            mediaType: attachment.mediaType,
            filename: attachment.filename,
          });
        } else if (attachment.type === "source-url") {
          attachmentParts.push({
            type: "source-url",
            url: attachment.url,
            mediaType: attachment.mediaType,
            title: attachment.filename,
          });
        }
      });

      if (attachmentParts.length) {
        if (firstTextIndex >= 0) {
          message.parts = [
            ...message.parts.slice(0, firstTextIndex),
            ...attachmentParts,
            ...message.parts.slice(firstTextIndex),
          ];
        } else {
          message.parts = [...message.parts, ...attachmentParts];
        }
      }
    }

    messages.push(message);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = (
      mentions.find((m) => m.type === "agent") as Extract<
        ChatMention,
        { type: "agent" }
      >
    )?.agentId;

    const agent = await rememberAgentAction(agentId, userId);
    const enabledMentions = agent?.instructions?.mentions?.length
      ? [...mentions, ...agent.instructions.mentions]
      : mentions;

    const useImageTool = Boolean(imageTool?.model);

    const isToolCallAllowed =
      supportToolCall &&
      (toolChoice != "none" || enabledMentions.length > 0) &&
      !useImageTool;

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // 用于累加文本内容，以便解析后续问题
        let accumulatedText = "";

        const mcpClients = await mcpClientsManager.getClients();
        const mcpTools = await mcpClientsManager.tools();
        logger.info(
          `mcp-server count: ${mcpClients.length}, mcp-tools count :${Object.keys(mcpTools).length}`,
        );
        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadMcpTools({
              mentions: enabledMentions,
              allowedMcpServers,
              dataStream,
            }),
          )
          .orElse({});

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions: enabledMentions,
              dataStream,
            }),
          )
          .orElse({});

        const TASK_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadTaskTools({
              mentions: enabledMentions,
              dataStream,
              userId,
            }),
          )
          .orElse({});

        const APP_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions: enabledMentions,
              allowedAppDefaultToolkit,
            }),
          )
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                {
                  ...MCP_TOOLS,
                  ...WORKFLOW_TOOLS,
                  ...TASK_DEFAULT_TOOLS,
                  ...APP_DEFAULT_TOOLS,
                },
                request.signal,
                dataStream,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        const mcpServerCustomizations = await safe()
          .map(() => {
            if (Object.keys(MCP_TOOLS ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(session.user.id);
          })
          .map((v) => filterMcpServerCustomizations(MCP_TOOLS!, v))
          .orElse({});

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences, agent),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
        );

        const IMAGE_TOOL: Record<string, Tool> = useImageTool
          ? {
              [ImageToolName]:
                imageTool?.model === "google"
                  ? nanoBananaTool
                  : openaiImageTool,
            }
          : {};
        const vercelAITooles = safe({
          ...MCP_TOOLS,
          ...WORKFLOW_TOOLS,
          ...TASK_DEFAULT_TOOLS,
        })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
              ...IMAGE_TOOL,
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        const allowedMcpTools = Object.values(allowedMcpServers ?? {})
          .map((t) => t.tools)
          .flat();

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${enabledMentions.length}`,
        );

        logger.info(
          `allowedMcpTools: ${allowedMcpTools.length ?? 0}, allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        if (useImageTool) {
          logger.info(`binding tool count Image: ${imageTool?.model}`);
        } else {
          logger.info(
            `binding tool count APP_DEFAULT: ${
              Object.keys(APP_DEFAULT_TOOLS ?? {}).length
            }, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}, Workflow: ${
              Object.keys(WORKFLOW_TOOLS ?? {}).length
            }, Task: ${Object.keys(TASK_DEFAULT_TOOLS ?? {}).length}`,
          );
        }
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        // 提取用户输入
        const textPart = message.parts.find(
          (part: any) => part?.type === "text",
        );
        const inputText =
          textPart && "text" in textPart
            ? (textPart as { text: string }).text
            : "";

        // 使用 startActiveObservation 创建顶层 span
        const executeStream = async () => {
          // 设置 trace 级别信息
          updateActiveTrace({
            name: "chat-request",
            sessionId: id,
            userId: session.user.id,
            metadata: {
              chatModel: `${chatModel?.provider}/${chatModel?.model}`,
              agentId: agent?.id,
              agentName: agent?.name,
              toolChoice,
            },
          });

          // 设置 observation 级别输入
          updateActiveObservation({
            input: inputText,
          });

          const result = streamText({
            model,
            system: systemPrompt,
            messages: convertToModelMessages(messages),
            experimental_transform: smoothStream({ chunking: "word" }),
            maxRetries: 2,
            tools: vercelAITooles,
            stopWhen: stepCountIs(10),
            toolChoice: "auto",
            abortSignal: request.signal,
            // 启用 Vercel AI SDK 的遥测功能，自动发送到 Langfuse
            experimental_telemetry: {
              isEnabled: true,
            },
          });

          // 累加文本内容以便解析后续问题
          (async () => {
            for await (const chunk of result.fullStream) {
              if (chunk.type === "text-delta") {
                accumulatedText += chunk.text;
              }
            }

            // stream 完全结束后，更新输出到 Langfuse
            updateActiveObservation({
              output: accumulatedText,
            });
            updateActiveTrace({
              output: accumulatedText,
            });
          })();

          result.consumeStream();
          dataStream.merge(
            result.toUIMessageStream({
              messageMetadata: ({ part }) => {
                if (part.type === "tool-result") {
                  if (VercelAITaskToolStreamingResultTag.isMaybe(part.output)) {
                    const tokenUsage = part.output.tokenUsage;
                    if (tokenUsage) {
                      metadata.usage = {
                        inputTokens:
                          (metadata.usage?.inputTokens ?? 0) +
                          tokenUsage.input_tokens,
                        outputTokens:
                          (metadata.usage?.outputTokens ?? 0) +
                          tokenUsage.output_tokens,
                        totalTokens:
                          (metadata.usage?.totalTokens ?? 0) +
                          tokenUsage.total_tokens,
                      };
                    }
                  }
                }
                if (part.type == "finish") {
                  metadata.usage = {
                    inputTokens:
                      (metadata.usage?.inputTokens ?? 0) +
                      (part.totalUsage?.inputTokens ?? 0),
                    outputTokens:
                      (metadata.usage?.outputTokens ?? 0) +
                      (part.totalUsage?.outputTokens ?? 0),
                    totalTokens:
                      (metadata.usage?.totalTokens ?? 0) +
                      (part.totalUsage?.totalTokens ?? 0),
                  };

                  part.totalUsage = metadata.usage;

                  // 解析后续问题（使用累加的文本）
                  const followUpQuestions =
                    parseFollowUpQuestions(accumulatedText);

                  if (followUpQuestions.length > 0) {
                    metadata.followUpQuestions = followUpQuestions;
                  }

                  return metadata;
                }
              },
            }),
          );

          return result;
        };

        if (langfuseSpanProcessor) {
          await startActiveObservation("chat-generation", executeStream, {
            endOnExit: true,
          });
        } else {
          await executeStream();
        }
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        // 解析后续问题并保存到数据库
        const textParts = responseMessage.parts.filter(
          (p) => p.type === "text",
        ) as Array<{ type: "text"; text: string }>;
        const fullText = textParts.map((p) => p.text).join("\n");
        const followUpQuestions = parseFollowUpQuestions(fullText);

        if (followUpQuestions.length > 0) {
          metadata.followUpQuestions = followUpQuestions;
        }

        // 清洗文本中的 XML 标签后再保存
        const cleanedParts = responseMessage.parts.map((part) => {
          if (part.type === "text") {
            return {
              ...part,
              text: stripFollowUpQuestionsTags(part.text),
            };
          }
          return part;
        });

        if (responseMessage.id == message.id) {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: cleanedParts.map(convertToSavePart),
            metadata,
          });
        } else {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
            id: message.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: cleanedParts.map(convertToSavePart),
            metadata,
          });
        }

        if (agent) {
          agentRepository.updateAgent(agent.id, session.user.id, {
            updatedAt: new Date(),
          } as any);
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    // 在请求完成后刷新 Langfuse span 数据
    if (langfuseSpanProcessor) {
      after(async () => {
        try {
          await langfuseSpanProcessor.forceFlush();
        } catch (e) {
          console.error("[chat] Failed to flush Langfuse:", e);
        }
      });
    }

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error(error);

    // 发生错误时也要刷新 span 数据
    if (langfuseSpanProcessor) {
      after(async () => {
        try {
          await langfuseSpanProcessor.forceFlush();
        } catch (e) {
          console.error("[chat] Failed to flush Langfuse on error:", e);
        }
      });
    }

    return Response.json({ message: error.message }, { status: 500 });
  }
}

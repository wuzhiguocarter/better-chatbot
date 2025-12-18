import { z } from "zod";
import { AllowedMCPServerZodSchema, AllowedMCPServer } from "app-types/mcp";
import {
  ChatAttachment,
  ChatAttachmentSchema,
  ChatMention,
  ChatMentionSchema,
  ChatModel,
} from "app-types/chat";
import { EvalFileStatus } from "@/types/eval";

export type EvaluationMetrics = {
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  durationMs?: number;
  error?: string;
};

export type EvalTaskChatConfig = {
  chatModel: ChatModel;
  toolChoice: "auto" | "none" | "manual";
  allowedAppDefaultToolkit: string[];
  allowedMcpServers: Record<string, AllowedMCPServer>;
  mentions?: ChatMention[];
  imageToolModel?: string;
  attachments?: ChatAttachment[];
};

export interface EvaluationResultItem {
  id: string;
  fileId: string;
  rowIndex: number;
  input: string;
  expectedOutput?: string | null;
  actualOutput?: string | null;
  success?: boolean | null;
  metrics?: EvaluationMetrics | null;
  executionTime?: number | null;
  timestamp?: string | Date | null;
  createdAt?: string;
  updatedAt?: string;
}

export type EvaluationResultItemEntity = Omit<
  EvaluationResultItem,
  "createdAt" | "updatedAt" | "timestamp"
> & {
  timestamp: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EvaluationResultItemCreateInput = Omit<
  EvaluationResultItemEntity,
  "id" | "fileId" | "createdAt" | "updatedAt"
>;

export interface EvaluationConfiguration {
  id: string;
  fileId: string;
  columns: string[];
  totalRows: number;
  inputColumn: string;
  expectedOutputColumn?: string | null;
  actualOutputColumn?: string | null;
  previewRows?: Record<string, any>[] | null;
  rawConfig?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
}

export type EvaluationConfigurationEntity = Omit<
  EvaluationConfiguration,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date;
  updatedAt: Date;
};

export type EvaluationConfigurationCreateInput = Omit<
  EvaluationConfigurationEntity,
  "id" | "createdAt" | "updatedAt"
>;

export type EvaluationConfigurationUpdateInput = Partial<
  Omit<
    EvaluationConfigurationEntity,
    "id" | "fileId" | "createdAt" | "updatedAt"
  >
>;

export interface EvaluationResults {
  detailed_results: EvaluationResultItem[];
  total_samples: number;
}

export interface EvaluationDetail {
  id: string;
  title: string;
  description: string | null;
  status: EvalFileStatus;
  createdAt: string;
  updatedAt: string;
  configuration: EvaluationConfiguration | null;
  results: EvaluationResults | null;
  summary?: Record<string, any> | null;
  logs?: Record<string, any>[] | null;
}

export const EvalTaskChatConfigZod = z.object({
  chatModel: z.object({ provider: z.string(), model: z.string() }),
  toolChoice: z.enum(["auto", "none", "manual"]),
  allowedAppDefaultToolkit: z.array(z.string()),
  allowedMcpServers: z.record(z.string(), AllowedMCPServerZodSchema),
  mentions: z.array(ChatMentionSchema).optional(),
  imageToolModel: z.string().optional(),
  attachments: z.array(ChatAttachmentSchema).optional(),
});

export const EvaluationConfigurationZod = z.object({
  id: z.string().optional(),
  fileId: z.string(),
  columns: z.array(z.string()),
  totalRows: z.number(),
  inputColumn: z.string(),
  expectedOutputColumn: z.string().nullable().optional(),
  actualOutputColumn: z.string().nullable().optional(),
  previewRows: z.array(z.record(z.string(), z.any())).nullable().optional(),
  rawConfig: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

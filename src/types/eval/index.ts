import { EvalFileStatus } from "@/types/eval";

export interface EvaluationResultItem {
  id: string;
  fileId: string;
  rowIndex: number;
  input: string;
  expectedOutput?: string | null;
  actualOutput?: string | null;
  success?: boolean | null;
  metrics?: Record<string, any> | null;
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

export type EvalFileStatus = "pending" | "running" | "completed" | "failed";

export interface EvalFile {
  id: string;
  title: string;
  status: EvalFileStatus;
  date: string;
  description?: string;

  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  storageKey?: string;
}

export type EvalFileEntity = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: EvalFileStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  fileUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EvalFileCreateInput = Omit<
  EvalFileEntity,
  "id" | "createdAt" | "updatedAt"
>;

export type EvalFileListQuery = {
  userId: string;
  page: number;
  limit: number;
  search?: string;
};

export type EvalFileRepository = {
  listEvalFilesByUserId(query: EvalFileListQuery): Promise<{
    rows: EvalFileEntity[];
    total: number;
  }>;
  createEvalFile(input: EvalFileCreateInput): Promise<EvalFileEntity>;
};

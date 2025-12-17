export type EvalFileStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "deleted";

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
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EvalFileCreateInput = Omit<
  EvalFileEntity,
  "id" | "createdAt" | "updatedAt" | "isDeleted" | "deletedAt"
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
  softDeleteEvalFile(params: {
    id: string;
    userId: string;
  }): Promise<EvalFileEntity | null>;
};

export interface EvalFile {
  id: string;
  title: string;
  status: "pending" | "running" | "completed";
  date: string;
  description?: string;
}

export interface EvalPagination {
  currentPage: number;
  totalPages: number;
  totalFiles: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface EvalResponse {
  files: EvalFile[];
  pagination: EvalPagination;
}

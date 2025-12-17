export interface EvalFile {
  id: string;
  title: string;
  status: "pending" | "running" | "completed";
  date: string;
  description?: string;
}

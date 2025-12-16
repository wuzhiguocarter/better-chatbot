export interface EvaluationDetail {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  date_created: string;
  date_completed: string | null;
  configuration: EvaluationConfiguration;
  results: EvaluationResultItem[] | null;
}

export interface EvaluationConfiguration {
  model: string;
  parameters: Record<string, any>;
  dataset_size: number;
  evaluation_type: string;
  metrics: string[];
}

export interface EvaluationResultItem {
  id: string;
  input: string;
  expected_output: string;
  actual_output: string;
  success: boolean;
  metrics: Record<string, any>; // Allow any type for flexibility
  execution_time: number;
  timestamp: string;
}

export interface EvaluationCard {
  id: string;
  title: string;
  status: EvaluationDetail["status"];
  date: string;
  description: string;
}

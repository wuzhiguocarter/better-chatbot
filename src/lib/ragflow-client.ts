const DEFAULT_RAGFLOW_SUPPORTED_MIME_TYPES =
  "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/mp4,audio/ogg,application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,application/csv,application/json";

export function getRAGFlowSupportedMimeTypes(): Set<string> {
  const value = DEFAULT_RAGFLOW_SUPPORTED_MIME_TYPES;
  return new Set(
    value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );
}

export function isRAGFlowSupported(mimeType: string): boolean {
  return getRAGFlowSupportedMimeTypes().has(mimeType);
}

export interface ProcessDocumentResult {
  success: boolean;
  documentId: string;
  chunks: string[];
}

export async function processDocument(
  file: File,
): Promise<ProcessDocumentResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/ragflow/process", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Process document failed");
  }

  const data = await res.json();
  return data;
}

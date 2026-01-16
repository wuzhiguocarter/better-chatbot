const DEFAULT_RAGFLOW_SUPPORTED_MIME_TYPES =
  "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/mp4,audio/ogg,application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,application/csv,application/json";

export type ThreadFileParseStatus = "UPLOADING" | "PARSING" | "READY" | "ERROR";

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

export type ProcessDocumentProgressCallback = (
  progress: number,
  status: ThreadFileParseStatus,
) => void;

export async function processDocument(
  file: File,
  onProgress?: ProcessDocumentProgressCallback,
): Promise<ProcessDocumentResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/ragflow/process/stream", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Process document failed");
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6);
      if (!jsonStr || jsonStr.trim() === "") continue;

      try {
        const data = JSON.parse(jsonStr);

        if (data.type === "progress" && onProgress) {
          onProgress(data.progress, data.status);
        } else if (data.type === "error") {
          throw new Error(data.error || "Process failed");
        } else if (data.type === "complete") {
          return data;
        }
      } catch (e) {
        if (e instanceof Error) throw e;
        console.error("Failed to parse SSE message:", e);
      }
    }
  }

  throw new Error("Process document failed: no complete message received");
}

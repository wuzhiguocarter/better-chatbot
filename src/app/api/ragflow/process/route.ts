import { NextRequest } from "next/server";

async function pollDocumentStatus(
  apiBase: string,
  datasetId: string,
  apiKey: string,
  documentId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000,
): Promise<"DONE" | "FAIL"> {
  const start = Date.now();
  const timeoutMs = maxAttempts * intervalMs;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${apiBase}/api/v1/datasets/${datasetId}/documents?id=${documentId}&page=1&page_size=1`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    const data = await res.json();
    const doc = data.data?.docs?.[0];

    if (doc) {
      console.log(
        `[RAGFlow Process] Document ${documentId} status: ${doc.run} (attempt ${i + 1}/${maxAttempts})`,
      );

      if (doc.run === "DONE") return "DONE";
      if (doc.run === "FAIL" || doc.run === "CANCEL") return "FAIL";
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error("Document parse timeout");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Document parse timeout");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const apiBase = process.env.RAGFLOW_API_BASE;
    const datasetId = process.env.RAGFLOW_DATASET_ID;
    const apiKey = process.env.RAGFLOW_API_KEY;

    if (!apiBase || !datasetId || !apiKey) {
      return Response.json(
        { error: "RAGFlow configuration missing" },
        { status: 500 },
      );
    }

    console.log(
      `[RAGFlow Process] Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`,
    );

    const ragflowFormData = new FormData();
    ragflowFormData.append("file", file);

    const uploadRes = await fetch(
      `${apiBase}/api/v1/datasets/${datasetId}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: ragflowFormData,
      },
    );

    const uploadData = await uploadRes.json();

    if (uploadData.code !== 0 || !uploadData.data?.length) {
      console.error("[RAGFlow Process] Upload failed:", uploadData);
      return Response.json(
        { error: uploadData.message || "Upload document failed" },
        { status: 400 },
      );
    }

    const documentId = uploadData.data[0].id;
    console.log(`[RAGFlow Process] Document uploaded, ID: ${documentId}`);

    const updateConfigRes = await fetch(
      `${apiBase}/api/v1/datasets/${datasetId}/documents/${documentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          chunk_method: "naive",
          parser_config: {
            chunk_token_num: 256,
            layout_recognize: true,
            html4excel: false,
            delimiter: "\n",
            task_page_size: 12,
            raptor: { use_raptor: false },
          },
          enabled: 1,
        }),
      },
    );

    const updateConfigData = await updateConfigRes.json();
    if (updateConfigData.code !== 0) {
      console.error(
        "[RAGFlow Process] Update config failed:",
        updateConfigData,
      );
      return Response.json(
        { error: updateConfigData.message || "Update document config failed" },
        { status: 400 },
      );
    }

    console.log("[RAGFlow Process] Config updated, starting parse...");

    const parseRes = await fetch(
      `${apiBase}/api/v1/datasets/${datasetId}/chunks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          document_ids: [documentId],
        }),
      },
    );

    const parseData = await parseRes.json();
    if (parseData.code !== 0) {
      console.error("[RAGFlow Process] Parse failed:", parseData);
      return Response.json(
        { error: parseData.message || "Parse documents failed" },
        { status: 400 },
      );
    }

    console.log("[RAGFlow Process] Polling document status...");

    const status = await pollDocumentStatus(
      apiBase,
      datasetId,
      apiKey,
      documentId,
    );

    if (status !== "DONE") {
      console.error("[RAGFlow Process] Document parse failed");
      return Response.json({ error: "Document parse failed" }, { status: 400 });
    }

    console.log(
      "[RAGFlow Process] Document parsed successfully, fetching chunks...",
    );

    const chunksRes = await fetch(
      `${apiBase}/api/v1/datasets/${datasetId}/documents/${documentId}/chunks`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    const chunksData = await chunksRes.json();

    if (chunksData.code !== 0) {
      console.error("[RAGFlow Process] Fetch chunks failed:", chunksData);
      return Response.json(
        { error: chunksData.message || "List chunks failed" },
        { status: 400 },
      );
    }

    const chunks =
      chunksData.data?.chunks.map((c: any) => c.content).filter(Boolean) ?? [];

    console.log(`[RAGFlow Process] Completed! Got ${chunks.length} chunks`);

    return Response.json({
      success: true,
      documentId,
      chunks,
    });
  } catch (error) {
    console.error("[RAGFlow Process] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Process failed" },
      { status: 500 },
    );
  }
}

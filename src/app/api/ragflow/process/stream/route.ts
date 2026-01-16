import { NextRequest } from "next/server";

function sendSSEMessage(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  data: any,
) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
          sendSSEMessage(encoder, controller, {
            type: "error",
            error: "No file provided",
          });
          controller.close();
          return;
        }

        const apiBase = process.env.RAGFLOW_API_BASE;
        const datasetId = process.env.RAGFLOW_DATASET_ID;
        const apiKey = process.env.RAGFLOW_API_KEY;

        if (!apiBase || !datasetId || !apiKey) {
          sendSSEMessage(encoder, controller, {
            type: "error",
            error: "RAGFlow configuration missing",
          });
          controller.close();
          return;
        }

        console.log(
          `[RAGFlow Stream] Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`,
        );

        sendSSEMessage(encoder, controller, {
          type: "progress",
          progress: 5,
          status: "UPLOADING",
        });

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
          console.error("[RAGFlow Stream] Upload failed:", uploadData);
          sendSSEMessage(encoder, controller, {
            type: "error",
            error: uploadData.message || "Upload document failed",
          });
          controller.close();
          return;
        }

        const documentId = uploadData.data[0].id;
        console.log(`[RAGFlow Stream] Document uploaded, ID: ${documentId}`);

        sendSSEMessage(encoder, controller, {
          type: "progress",
          progress: 10,
          status: "UPLOADING",
        });

        const updateConfigRes = await fetch(
          `${apiBase}/api/v1/datasets/${datasetId}/documents/${documentId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
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
            "[RAGFlow Stream] Update config failed:",
            updateConfigData,
          );
          sendSSEMessage(encoder, controller, {
            type: "error",
            error: updateConfigData.message || "Update document config failed",
          });
          controller.close();
          return;
        }

        console.log("[RAGFlow Stream] Config updated, starting parse...");

        sendSSEMessage(encoder, controller, {
          type: "progress",
          progress: 15,
          status: "PARSING",
        });

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
          console.error("[RAGFlow Stream] Parse failed:", parseData);
          sendSSEMessage(encoder, controller, {
            type: "error",
            error: parseData.message || "Parse documents failed",
          });
          controller.close();
          return;
        }

        console.log("[RAGFlow Stream] Polling document status...");

        const maxAttempts = 60;
        const intervalMs = 2000;
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
            const progress = Math.min(
              15 + Math.round(((i + 1) / maxAttempts) * 85),
              100,
            );

            console.log(
              `[RAGFlow Stream] Document ${documentId} status: ${doc.run} (attempt ${i + 1}/${maxAttempts}, progress: ${progress}%)`,
            );

            sendSSEMessage(encoder, controller, {
              type: "progress",
              progress,
              status: "PARSING",
            });

            if (doc.run === "DONE") {
              console.log(
                "[RAGFlow Stream] Document parsed successfully, fetching chunks...",
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
                console.error(
                  "[RAGFlow Stream] Fetch chunks failed:",
                  chunksData,
                );
                sendSSEMessage(encoder, controller, {
                  type: "error",
                  error: chunksData.message || "List chunks failed",
                });
                controller.close();
                return;
              }

              const chunks =
                chunksData.data?.chunks
                  .map((c: any) => c.content)
                  .filter(Boolean) ?? [];

              console.log(
                `[RAGFlow Stream] Completed! Got ${chunks.length} chunks`,
              );

              sendSSEMessage(encoder, controller, {
                type: "complete",
                success: true,
                documentId,
                chunks,
              });

              controller.close();
              return;
            }

            if (doc.run === "FAIL" || doc.run === "CANCEL") {
              sendSSEMessage(encoder, controller, {
                type: "error",
                error: `Document parse failed: ${doc.run}`,
              });
              controller.close();
              return;
            }
          }

          if (Date.now() - start > timeoutMs) {
            sendSSEMessage(encoder, controller, {
              type: "error",
              error: "Document parse timeout",
            });
            controller.close();
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        sendSSEMessage(encoder, controller, {
          type: "error",
          error: "Document parse timeout",
        });
        controller.close();
      } catch (error) {
        console.error("[RAGFlow Stream] Error:", error);
        sendSSEMessage(encoder, controller, {
          type: "error",
          error: error instanceof Error ? error.message : "Process failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/server";
import {
  evalConfigurationRepository,
  evalFileRepository,
  evalResultRepository,
} from "lib/db/repository";
import { serverFileStorage } from "lib/file-storage";
import { parseCsvDataset } from "lib/file-ingest/csv";
import type { EvalFile } from "@/types/eval";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const search = searchParams.get("search") ?? "";

  const { rows, total } = await evalFileRepository.listEvalFilesByUserId({
    userId: session.user.id,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    search,
  });

  const files: EvalFile[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    date: row.createdAt.toISOString(),
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
    fileUrl: row.fileUrl,
    storageKey: row.storageKey,
  }));

  return NextResponse.json({
    files,
    total,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      fileName,
      fileType,
      fileSize,
      storageKey,
      fileUrl,
    } = body;

    if (
      !title ||
      !fileName ||
      !fileType ||
      !fileSize ||
      !storageKey ||
      !fileUrl
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 },
      );
    }

    const createdEvalFile = await evalFileRepository.createEvalFile({
      userId: session.user.id,
      title,
      description: description ?? null,
      status: "pending",
      fileName,
      fileType,
      fileSize,
      storageKey,
      fileUrl,
    });

    const isCsv =
      fileType === "text/csv" ||
      /\.csv$/i.test(fileName ?? "") ||
      fileName?.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      return NextResponse.json(
        { error: "Only CSV files are currently supported" },
        { status: 400 },
      );
    }

    const buffer = await serverFileStorage.download(createdEvalFile.storageKey);
    const dataset = await parseCsvDataset({ buffer });

    if (!dataset.columns.includes("input")) {
      return NextResponse.json(
        { error: "CSV must contain an 'input' column" },
        { status: 400 },
      );
    }

    const expectedOutputColumn = dataset.columns.find(
      (column) => column.toLowerCase() === "expected_output",
    );
    const actualOutputColumn = dataset.columns.find(
      (column) => column.toLowerCase() === "actual_output",
    );

    await evalConfigurationRepository.upsertByFileId(createdEvalFile.id, {
      fileId: createdEvalFile.id,
      columns: dataset.columns,
      totalRows: dataset.rows.length,
      inputColumn: "input",
      expectedOutputColumn,
      actualOutputColumn,
      previewRows: dataset.rows.slice(0, 10),
      rawConfig: {},
    });

    const rows = dataset.rows.map((row, index) => {
      const successValue = row.success ?? row["success"];
      const parsedSuccess =
        typeof successValue === "string"
          ? ["true", "1", "yes"].includes(successValue.toLowerCase())
          : typeof successValue === "boolean"
            ? successValue
            : null;

      const executionRaw =
        row.execution_time ?? row["execution_time"] ?? row.executionTime;
      const executionTime =
        executionRaw !== undefined &&
        executionRaw !== null &&
        executionRaw !== ""
          ? Number(executionRaw)
          : null;

      const rawTimestamp = row.timestamp ?? row["timestamp"];
      const parsedTimestamp =
        rawTimestamp && !Number.isNaN(new Date(rawTimestamp).getTime())
          ? new Date(rawTimestamp)
          : null;

      return {
        rowIndex: index,
        input: row.input ?? "",
        expectedOutput: expectedOutputColumn
          ? (row[expectedOutputColumn] ?? null)
          : null,
        actualOutput: actualOutputColumn
          ? (row[actualOutputColumn] ?? null)
          : null,
        success: parsedSuccess,
        metrics: null,
        executionTime: Number.isFinite(executionTime) ? executionTime : null,
        timestamp: parsedTimestamp,
      };
    });

    await evalResultRepository.insertMany(createdEvalFile.id, rows);

    const result: EvalFile = {
      id: createdEvalFile.id,
      title: createdEvalFile.title,
      description: createdEvalFile.description ?? undefined,
      status: createdEvalFile.status,
      date: createdEvalFile.createdAt.toISOString(),
      fileName: createdEvalFile.fileName,
      fileType: createdEvalFile.fileType,
      fileSize: createdEvalFile.fileSize,
      fileUrl: createdEvalFile.fileUrl,
      storageKey: createdEvalFile.storageKey,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/eval] failed to process evaluation", error);
    return NextResponse.json(
      { error: "Failed to process evaluation file" },
      { status: 500 },
    );
  }
}

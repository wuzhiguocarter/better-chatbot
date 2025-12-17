import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/server";
import { evalFileRepository } from "lib/db/repository";
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

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
  }

  const row = await evalFileRepository.createEvalFile({
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

  const result: EvalFile = {
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
  };

  return NextResponse.json(result, { status: 201 });
}

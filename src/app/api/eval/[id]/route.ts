import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/server";
import {
  evalConfigurationRepository,
  evalFileRepository,
  evalResultRepository,
} from "lib/db/repository";
import {
  EvaluationConfiguration,
  EvaluationDetail,
  EvaluationResultItem,
} from "@/types/eval/index";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const evalFile = await evalFileRepository.findById(id);

  if (!evalFile || evalFile.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 },
    );
  }

  const configurationEntity = await evalConfigurationRepository.getByFileId(id);
  const resultEntities = await evalResultRepository.listByFileId(id);

  const configuration: EvaluationConfiguration | null = configurationEntity
    ? {
        ...configurationEntity,
        previewRows: configurationEntity.previewRows ?? null,
        rawConfig: configurationEntity.rawConfig ?? null,
        createdAt: configurationEntity.createdAt.toISOString(),
        updatedAt: configurationEntity.updatedAt.toISOString(),
      }
    : null;

  const detailedResults: EvaluationResultItem[] = resultEntities.map(
    (item) => ({
      id: item.id,
      fileId: item.fileId,
      rowIndex: item.rowIndex,
      input: item.input,
      expectedOutput: item.expectedOutput,
      actualOutput: item.actualOutput,
      success: item.success,
      metrics: item.metrics,
      executionTime: item.executionTime,
      timestamp: item.timestamp ? item.timestamp.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }),
  );

  const evaluation: EvaluationDetail = {
    id: evalFile.id,
    title: evalFile.title,
    description: evalFile.description,
    status: evalFile.status,
    createdAt: evalFile.createdAt.toISOString(),
    updatedAt: evalFile.updatedAt.toISOString(),
    configuration,
    results: {
      detailed_results: detailedResults,
      total_samples: detailedResults.length,
    },
    summary: null,
    logs: null,
  };

  return NextResponse.json({
    evaluation,
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  // Handle different actions
  switch (action) {
    case "start":
      return NextResponse.json({
        file: {
          id: id,
          status: "running",
        },
      });
    case "stop":
      return NextResponse.json({
        file: {
          id: id,
          status: "pending",
        },
      });
    case "complete":
      return NextResponse.json({
        file: {
          id: id,
          status: "completed",
        },
      });
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await evalFileRepository.softDeleteEvalFile({
      id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Eval file not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/eval/:id] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

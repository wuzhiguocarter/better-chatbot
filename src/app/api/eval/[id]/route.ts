import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  EvalTaskChatConfig,
  EvalTaskChatConfigZod,
  EvaluationConfigurationZod,
} from "@/types/eval/index";
import { startEvalJobInBackground } from "lib/eval/eval-scheduler";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const EvalPatchSchema = z.object({
  action: z.enum(["start", "stop", "reset"]),
  configuration: EvaluationConfigurationZod.optional(),
  chatConfig: EvalTaskChatConfigZod.optional(),
});

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
  const json = await request.json();

  // Add defensive checks for schema parsing
  if (!EvalPatchSchema) {
    console.error("[PATCH /api/eval/:id] EvalPatchSchema is undefined");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  let parsedData: z.infer<typeof EvalPatchSchema>;
  try {
    parsedData = EvalPatchSchema.parse(json);
  } catch (error) {
    console.error("[PATCH /api/eval/:id] Schema validation error:", error);
    return NextResponse.json(
      {
        error: "Invalid request data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }

  const { action, configuration, chatConfig } = parsedData;

  const evalFile = await evalFileRepository.findById(id);

  if (!evalFile || evalFile.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 },
    );
  }

  switch (action) {
    case "start": {
      if (evalFile.status === "running") {
        return NextResponse.json(
          { error: "Evaluation already running" },
          { status: 400 },
        );
      }

      const existingConfiguration =
        await evalConfigurationRepository.getByFileId(id);

      const baseConfiguration = configuration ?? existingConfiguration;

      if (!baseConfiguration) {
        return NextResponse.json(
          { error: "Evaluation configuration not found" },
          { status: 400 },
        );
      }

      const rawChatConfig =
        chatConfig ??
        (configuration?.rawConfig as { chatConfig?: EvalTaskChatConfig })
          ?.chatConfig ??
        baseConfiguration.rawConfig?.chatConfig;

      if (!rawChatConfig) {
        return NextResponse.json(
          { error: "Chat configuration is required to start" },
          { status: 400 },
        );
      }

      const {
        id: _configId,
        createdAt,
        updatedAt,
        ...restBaseConfig
      } = baseConfiguration;

      const configToSave: Omit<EvaluationConfiguration, "id"> = {
        ...restBaseConfig,
        fileId: id,
        rawConfig: {
          ...(restBaseConfig.rawConfig ?? {}),
          ...(configuration?.rawConfig ?? {}),
          chatConfig: rawChatConfig,
        },
        createdAt: undefined,
        updatedAt: undefined,
      };

      await evalConfigurationRepository.upsertByFileId(id, {
        fileId: id,
        columns: configToSave.columns,
        totalRows: configToSave.totalRows,
        inputColumn: configToSave.inputColumn,
        expectedOutputColumn: configToSave.expectedOutputColumn ?? null,
        actualOutputColumn: configToSave.actualOutputColumn ?? null,
        previewRows: configToSave.previewRows ?? null,
        rawConfig: configToSave.rawConfig ?? {},
      });

      await evalResultRepository.listByFileId(id); // ensure results exist

      await evalFileRepository.updateStatus({ id, status: "running" });
      startEvalJobInBackground({ fileId: id, userId: session.user.id });

      return NextResponse.json({ status: "running" });
    }
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

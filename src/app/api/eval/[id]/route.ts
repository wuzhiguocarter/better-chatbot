import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/server";
import { evalFileRepository } from "lib/db/repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Transform function to convert mock results to EvaluationResultItem format
function transformLegacyResults(legacyResults: any[]): any[] {
  return legacyResults.map((result, index) => ({
    id: result.id,
    input: result.input,
    expected_output: "预期输出示例", // Add expected output for the new structure
    actual_output: result.output,
    success: result.success, // Keep boolean success value
    metrics: result.metadata || {},
    execution_time: result.totalLatency,
    timestamp: new Date(Date.now() - index * 1000).toISOString(), // Generate timestamps
  }));
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Legacy mock data for transformation
  const legacyResults = [
    {
      id: "1",
      input: "高并发token生成测试用例",
      output: "生成了2000个token，用时95ms",
      totalLatency: 95,
      success: true,
      metadata: {
        tokensGenerated: 2000,
        promptTokens: 50,
        completionTokens: 1950,
      },
    },
    {
      id: "2",
      input: "复杂推理任务测试",
      output: "完成了多步骤逻辑推理，用时156ms",
      success: true,
      totalLatency: 156,
      metadata: {
        reasoningSteps: 5,
        complexity: "high",
      },
    },
    {
      id: "3",
      input: "代码生成能力测试",
      output: "生成了一个Python函数，用时203ms",
      totalLatency: 203,
      success: true,
      metadata: {
        linesOfCode: 15,
        language: "python",
      },
    },
    {
      id: "4",
      input: "长文本理解测试",
      output: "准确理解了5000字文档内容，用时178ms",
      totalLatency: 178,
      success: true,
      metadata: {
        documentLength: 5000,
        comprehensionAccuracy: 98,
      },
    },
    {
      id: "5",
      input: "多语言翻译测试",
      output: "中英日三互译，用时134ms",
      totalLatency: 134,
      success: true,
      metadata: {
        languages: ["zh", "en", "ja"],
        translationQuality: 92,
      },
    },
  ];

  // Transform legacy results to new format
  const detailedResults = transformLegacyResults(legacyResults);

  // Mock detailed evaluation data with simplified structure
  const mockEvaluationDetail = {
    id: id,
    title: `评估任务 ${id}`,
    description:
      "针对模型性能的全面评估，包含推理延迟、准确性和资源消耗等多个维度的测试",
    status: "completed",
    date_created: "2025-12-15T10:30:00Z",
    date_completed: "2025-12-15T10:45:00Z",
    configuration: {
      model: "gpt-4-turbo",
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
      },
      dataset_size: 5,
      evaluation_type: "performance_test",
      metrics: ["accuracy", "latency", "throughput"],
    },
    results: detailedResults, // Simplified: just the array
    logs: [
      {
        id: "log-1",
        timestamp: "2025-12-15T10:30:00Z",
        level: "info",
        message: "评估任务开始",
        details: { model: "gpt-4-turbo", dataset_size: 5 },
      },
      {
        id: "log-2",
        timestamp: "2025-12-15T10:32:15Z",
        level: "info",
        message: "完成第一个测试用例",
        details: { test_id: "1", latency: 95 },
      },
    ],
  };

  return NextResponse.json({
    evaluation: mockEvaluationDetail,
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

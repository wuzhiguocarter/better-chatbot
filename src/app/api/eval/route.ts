import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "9");
  const search = searchParams.get("search") || "";

  // Mock data for evaluation files
  const mockEvalFiles = [
    {
      id: "1",
      title: "企业服务智能体评估",
      status: "running",
      date: "2025/12/31",
      description: "评估企业服务智能体的性能和准确性",
    },
    {
      id: "2",
      title: "客服机器人效果评估",
      status: "completed",
      date: "2025/12/30",
      description: "评估客服机器人在实际场景中的表现",
    },
    {
      id: "3",
      title: "数据分析助手评估",
      status: "pending",
      date: "2025/12/29",
      description: "评估数据分析助手的数据处理能力",
    },
    {
      id: "4",
      title: "智能写作助手评估",
      status: "completed",
      date: "2025/12/28",
      description: "评估智能写作助手的文本生成质量",
    },
    {
      id: "5",
      title: "代码审查智能体评估",
      status: "running",
      date: "2025/12/27",
      description: "评估代码审查智能体的准确性",
    },
    {
      id: "6",
      title: "翻译系统评估",
      status: "pending",
      date: "2025/12/26",
      description: "评估翻译系统的翻译质量",
    },
    {
      id: "7",
      title: "推荐算法评估",
      status: "completed",
      date: "2025/12/25",
      description: "评估推荐算法的准确性",
    },
    {
      id: "8",
      title: "情感分析评估",
      status: "running",
      date: "2025/12/24",
      description: "评估情感分析模型的准确性",
    },
    {
      id: "9",
      title: "图像识别评估",
      status: "pending",
      date: "2025/12/23",
      description: "评估图像识别模型的性能",
    },
    {
      id: "10",
      title: "语音转文字评估",
      status: "completed",
      date: "2025/12/22",
      description: "评估语音转文字的准确率",
    },
  ];

  // Filter by search term
  let filteredFiles = mockEvalFiles;
  if (search) {
    filteredFiles = mockEvalFiles.filter(
      (file) =>
        file.title.toLowerCase().includes(search.toLowerCase()) ||
        file.description.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

  return NextResponse.json({
    files: paginatedFiles,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filteredFiles.length / limit),
      totalFiles: filteredFiles.length,
      hasNextPage: endIndex < filteredFiles.length,
      hasPreviousPage: page > 1,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description } = body;

  // Create new evaluation file
  const newEvalFile = {
    id: Date.now().toString(),
    title,
    description: description || "",
    status: "pending",
    date: new Date()
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "/"),
  };

  return NextResponse.json({ file: newEvalFile }, { status: 201 });
}

#!/usr/bin/env tsx
/**
 * 聊天历史导出脚本
 *
 * 功能:
 * - 导出所有用户的聊天历史为 Markdown 格式
 * - 按用户分文件夹,每个会话一个文件
 * - 支持多种消息类型 (文本、工具、文件等)
 *
 * 使用方法:
 *   pnpm tsx scripts/export-chat-history.ts
 *
 * 环境变量:
 *   POSTGRES_URL - 数据库连接字符串
 */

import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import type { UIMessage } from "ai";

// 加载环境变量
if (process.env.CI) {
  config({ path: ".env.test" });
} else {
  config();
}

// 导入数据库相关
import {
  UserTable,
  ChatThreadTable,
  ChatMessageTable,
} from "../src/lib/db/pg/schema.pg";
import type { ChatMetadata } from "../src/types/chat";

// 类型定义
interface ExportOptions {
  outputDir: string;
  includeSystemMessages?: boolean;
  verbose?: boolean;
}

interface ExportStats {
  totalUsers: number;
  totalThreads: number;
  totalMessages: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ user: string; thread: string; error: string }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface Thread {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
}

interface Message {
  id: string;
  threadId: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
  metadata?: ChatMetadata;
  createdAt: Date;
}

// 创建数据库连接
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});
const db = drizzle(pool);

// 默认配置
const DEFAULT_OPTIONS: ExportOptions = {
  outputDir: "./exports",
  includeSystemMessages: false,
  verbose: true,
};

/**
 * 获取所有用户
 */
async function getAllUsers(): Promise<User[]> {
  const users = await db
    .select({
      id: UserTable.id,
      name: UserTable.name,
      email: UserTable.email,
      createdAt: UserTable.createdAt,
    })
    .from(UserTable)
    .orderBy(UserTable.createdAt);
  return users as User[];
}

/**
 * 获取用户的所有会话
 */
async function getUserThreads(userId: string): Promise<Thread[]> {
  const threads = await db
    .select({
      id: ChatThreadTable.id,
      title: ChatThreadTable.title,
      userId: ChatThreadTable.userId,
      createdAt: ChatThreadTable.createdAt,
    })
    .from(ChatThreadTable)
    .where(eq(ChatThreadTable.userId, userId))
    .orderBy(desc(ChatThreadTable.createdAt));
  return threads as Thread[];
}

/**
 * 获取会话的所有消息
 */
async function getThreadMessages(threadId: string): Promise<Message[]> {
  const messages = await db
    .select({
      id: ChatMessageTable.id,
      threadId: ChatMessageTable.threadId,
      role: ChatMessageTable.role,
      parts: ChatMessageTable.parts,
      metadata: ChatMessageTable.metadata,
      createdAt: ChatMessageTable.createdAt,
    })
    .from(ChatMessageTable)
    .where(eq(ChatMessageTable.threadId, threadId))
    .orderBy(ChatMessageTable.createdAt);
  return messages as Message[];
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-") // 替换非法字符
    .replace(/\s+/g, "-") // 替换空格
    .replace(/[-]{2,}/g, "-") // 合并多个连字符
    .slice(0, 100); // 限制长度
}

/**
 * 格式化时间戳
 */
function formatTimestamp(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将消息 parts 转换为 Markdown
 */
function convertPartsToMarkdown(
  parts: UIMessage["parts"],
  role: UIMessage["role"],
  metadata?: ChatMetadata,
): string {
  let markdown = "";

  for (const part of parts) {
    switch (part.type) {
      case "text":
        markdown += part.text;
        break;

      case "tool-call":
        markdown += convertToolCallPart(part);
        break;

      case "tool-result":
        // tool-result 通常包含在 tool-call 的 output 中，跳过
        break;

      case "file":
        markdown += convertFilePart(part);
        break;

      case "source-url":
        markdown += convertSourceUrlPart(part);
        break;

      case "reasoning":
        markdown += convertReasoningPart(part);
        break;

      default:
        markdown += `\n<!-- Unknown part type: ${(part as { type: string }).type} -->\n`;
    }
  }

  // 添加元数据（仅 assistant 消息）
  if (metadata && role === "assistant") {
    markdown += addMetadataFooter(metadata);
  }

  return markdown;
}

/**
 * 转换工具调用部分
 */
function convertToolCallPart(part: {
  type: "tool-call";
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  state?: string;
  output?: unknown;
}): string {
  let md = `\n#### 🔧 工具调用: \`${part.toolName}\`\n\n`;

  if (Object.keys(part.args).length > 0) {
    md += `**参数**:\n\`\`\`json\n${JSON.stringify(part.args, null, 2)}\n\`\`\`\n\n`;
  }

  if (part.state) {
    md += `**状态**: ${part.state}\n`;
  }

  if (part.output !== undefined) {
    const outputStr =
      typeof part.output === "string"
        ? part.output
        : JSON.stringify(part.output, null, 2);
    md += `\n**结果**:\n\`\`\`\n${outputStr}\n\`\`\`\n\n`;
  }

  return md;
}

/**
 * 转换文件部分
 */
function convertFilePart(part: {
  type: "file";
  name?: string;
  content?: string;
  mimeType?: string;
  size?: number;
}): string {
  let md = `\n#### 📎 文件附件\n\n`;

  if (part.name) md += `- **文件名**: ${part.name}\n`;
  if (part.mimeType) md += `- **类型**: ${part.mimeType}\n`;
  if (part.size) md += `- **大小**: ${(part.size / 1024).toFixed(2)} KB\n`;

  // 检查 content 是否存在
  if (!part.content) {
    return md + `\n**内容**: [无内容]\n\n`;
  }

  // 如果是图片且内容不太大，可以嵌入
  if (part.mimeType?.startsWith("image/") && part.content.length < 500000) {
    md += `\n![${part.name || "图片"}](${part.content})\n`;
  } else if (part.content.startsWith("http")) {
    md += `\n**链接**: ${part.content}\n`;
  } else if (part.content.startsWith("data:")) {
    md += `\n**内容**: [Base64 数据, 长度 ${part.content.length}]\n`;
  }

  return md + "\n";
}

/**
 * 转换 URL 来源部分
 */
function convertSourceUrlPart(part: {
  type: "source-url";
  url: string;
}): string {
  return `\n#### 🔗 来源\n\n${part.url}\n\n`;
}

/**
 * 转换推理过程部分
 */
function convertReasoningPart(part: {
  type: "reasoning";
  text: string;
}): string {
  return `\n#### 💭 思考过程\n\n> ${part.text}\n\n`;
}

/**
 * 添加元数据页脚
 */
function addMetadataFooter(metadata: ChatMetadata): string {
  let footer = "\n\n---\n\n";

  if (metadata.chatModel) {
    footer += `**模型**: ${metadata.chatModel.provider}/${metadata.chatModel.model}\n`;
  }

  if (metadata.usage) {
    footer += `**Token 使用**: ${metadata.usage.inputTokens} → ${metadata.usage.outputTokens} (总计: ${metadata.usage.totalTokens})\n`;
  }

  if (metadata.agentId) {
    footer += `**代理 ID**: ${metadata.agentId}\n`;
  }

  if (metadata.toolChoice) {
    footer += `**工具选择**: ${metadata.toolChoice}\n`;
  }

  return footer;
}

/**
 * 获取角色图标
 */
function getRoleIcon(role: UIMessage["role"]): string {
  switch (role) {
    case "user":
      return "👤";
    case "assistant":
      return "🤖";
    case "system":
      return "⚙️";
    case "tool":
      return "🔧";
    default:
      return "💬";
  }
}

/**
 * 获取角色名称
 */
function getRoleName(role: UIMessage["role"]): string {
  switch (role) {
    case "user":
      return "用户";
    case "assistant":
      return "助手";
    case "system":
      return "系统";
    case "tool":
      return "工具";
    default:
      return "未知";
  }
}

/**
 * 生成会话的 Markdown
 */
function generateThreadMarkdown(
  user: User,
  thread: Thread,
  messages: Message[],
): string {
  let markdown = `# ${thread.title}\n\n`;

  // 导出信息
  markdown += `**导出信息**\n`;
  markdown += `- 用户: ${user.name} (${user.email})\n`;
  markdown += `- 创建时间: ${formatTimestamp(thread.createdAt)}\n`;
  markdown += `- 消息数量: ${messages.length}\n`;
  markdown += `\n---\n\n`;

  // 对话内容
  markdown += `## 对话内容\n\n`;

  for (const message of messages) {
    const icon = getRoleIcon(message.role);
    const name = getRoleName(message.role);
    const time = formatTimestamp(message.createdAt);

    markdown += `### ${icon} ${name} - ${time}\n\n`;

    // 转换消息内容
    const content = convertPartsToMarkdown(
      message.parts,
      message.role,
      message.metadata,
    );
    markdown += content;

    markdown += `\n---\n\n`;
  }

  return markdown;
}

/**
 * 确保输出目录存在
 */
function createOutputDirectory(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

/**
 * 主函数
 */
async function main(options: ExportOptions = DEFAULT_OPTIONS) {
  console.log("🚀 开始导出聊天历史...\n");

  // 确保输出目录存在
  createOutputDirectory(options.outputDir);

  // 获取所有用户
  const users = await getAllUsers();
  console.log(`📊 找到 ${users.length} 个用户\n`);

  const stats: ExportStats = {
    totalUsers: users.length,
    totalThreads: 0,
    totalMessages: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  // 遍历每个用户
  for (const user of users) {
    console.log(`\n👤 处理用户: ${user.name} (${user.email})`);

    try {
      // 获取用户的所有会话
      const threads = await getUserThreads(user.id);
      stats.totalThreads += threads.length;

      if (threads.length === 0) {
        console.log("  📭 没有会话");
        continue;
      }

      // 创建用户文件夹
      const userDir = path.join(
        options.outputDir,
        sanitizeFileName(user.email),
      );
      fs.mkdirSync(userDir, { recursive: true });

      // 遍历每个会话
      for (const thread of threads) {
        try {
          if (options.verbose) {
            console.log(`  📝 导出会话: ${thread.title}`);
          }

          // 获取会话消息
          const messages = await getThreadMessages(thread.id);

          // 过滤系统消息（如果需要）
          const filteredMessages = options.includeSystemMessages
            ? messages
            : messages.filter((m) => m.role !== "system");

          stats.totalMessages += filteredMessages.length;

          // 生成 Markdown
          const markdown = generateThreadMarkdown(
            user,
            thread,
            filteredMessages,
          );

          // 写入文件
          const fileName = `${sanitizeFileName(thread.title)}-${thread.id.slice(0, 8)}.md`;
          const filePath = path.join(userDir, fileName);
          fs.writeFileSync(filePath, markdown, "utf-8");

          stats.successCount++;
        } catch (error) {
          stats.errorCount++;
          stats.errors.push({
            user: user.email,
            thread: thread.id,
            error: error instanceof Error ? error.message : String(error),
          });
          console.error(`    ❌ 导出失败: ${error}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ 处理用户失败: ${error}`);
    }
  }

  // 输出统计
  console.log("\n\n✅ 导出完成!");
  console.log(`\n📊 统计信息:`);
  console.log(`   - 用户数量: ${stats.totalUsers}`);
  console.log(`   - 会话数量: ${stats.totalThreads}`);
  console.log(`   - 消息数量: ${stats.totalMessages}`);
  console.log(`   - 成功: ${stats.successCount}`);
  console.log(`   - 失败: ${stats.errorCount}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ 错误列表:`);
    stats.errors.forEach((err) => {
      console.log(`   - ${err.user} / ${err.thread}: ${err.error}`);
    });
  }

  console.log(`\n📁 导出目录: ${path.resolve(options.outputDir)}`);

  // 关闭数据库连接
  await pool.end();
}

// 执行入口
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log("\n🎉 脚本执行成功!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 脚本执行失败:", error);
      process.exit(1);
    });
}

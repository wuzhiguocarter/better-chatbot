[根目录](../../../CLAUDE.md) > [src/lib](../../) > **ai AI 核心模块**

# AI 核心模块

## 模块职责

AI 功能的核心实现，包括多模型支持、MCP 协议集成、工具系统、工作流执行引擎等。

## 目录结构

```
ai/
├── models.ts                     # AI 模型管理
├── prompts.ts                    # 系统提示词
├── agent/                        # AI 代理
│   └── example.ts               # 代理示例
├── mcp/                          # MCP 协议实现
│   ├── mcp-manager.ts           # MCP 管理器
│   ├── create-mcp-client.ts     # MCP 客户端创建
│   ├── create-mcp-clients-manager.ts # MCP 客户端管理器
│   ├── db-mcp-config-storage.ts # 数据库配置存储
│   ├── fb-mcp-config-storage.ts # 文件配置存储
│   ├── memory-mcp-config-storage.ts # 内存配置存储
│   ├── mcp-config-diff.ts       # 配置差异比较
│   ├── oauth-redirect.ts        # OAuth 重定向处理
│   └── pg-oauth-provider.ts     # PostgreSQL OAuth 提供商
├── tools/                        # 工具系统
│   ├── index.ts                 # 工具定义
│   ├── tool-kit.ts              # 工具集合
│   ├── code/                    # 代码执行工具
│   │   ├── js-run-tool.ts       # JavaScript 执行
│   │   └── python-run-tool.ts   # Python 执行
│   ├── http/fetch.ts            # HTTP 请求工具
│   ├── image/                   # 图像处理工具
│   ├── visualization/           # 数据可视化工具
│   │   ├── create-bar-chart.ts  # 柱状图
│   │   ├── create-line-chart.ts # 折线图
│   │   ├── create-pie-chart.ts  # 饼图
│   │   └── create-table.ts      # 交互式表格
│   └── web/web-search.ts        # 网络搜索工具
├── workflow/                     # 工作流系统
│   ├── executor/                # 工作流执行器
│   │   ├── workflow-executor.ts # 执行器核心
│   │   ├── node-executor.ts     # 节点执行器
│   │   ├── graph-store.ts       # 图存储
│   │   └── extract-node-dependency-schema.ts # 节点依赖
│   ├── arrange-nodes.ts         # 节点排列
│   ├── condition.ts             # 条件判断
│   ├── create-ui-node.ts        # UI 节点创建
│   ├── examples/                # 工作流示例
│   ├── node-validate.ts         # 节点验证
│   ├── shared.workflow.ts       # 共享工作流
│   ├── workflow.interface.ts    # 工作流接口
│   └── would-create-cycle.ts    # 循环检测
├── file-support.ts              # 文件支持配置
├── create-openai-compatiable.ts # OpenAI 兼容模型
├── azure-openai-compatible.ts   # Azure OpenAI 兼容
└── speech/                      # 语音功能
    ├── index.ts                 # 语音入口
    └── open-ai/                 # OpenAI 实时语音
        ├── use-voice-chat.openai.ts
        └── openai-realtime-event.ts
```

## 入口与启动

### 模型管理 - models.ts
- 集成多个 AI 提供商（OpenAI, Anthropic, Google, xAI, Ollama, Groq）
- 动态模型加载和 API Key 管理
- 文件上传支持配置

### MCP 管理器 - mcp-manager.ts
```typescript
// 全局 MCP 客户端管理器
export const mcpClientsManager = globalThis.__mcpClientsManager__;
export const initMCPManager = async () => {
  return globalThis.__mcpClientsManager__.init();
};
```

## 消息处理流程

### 概述

AI 核心模块负责将用户输入的消息转换为各个 LLM 提供商可以理解的格式，并处理流式响应。详细的消息流转过程请参考 [消息数据流转文档](../../../docs/architecture/message-data-flow.md)。

### 数据转换关键点

#### 1. 消息格式转换

**核心函数**: `convertToModelMessages()` (由 Vercel AI SDK 提供)

```typescript
// 来自 src/app/api/chat/route.ts
import { convertToModelMessages, streamText } from "ai";

// TYPE-CONVERSION: UIMessage[] → ModelMessage[]
const result = streamText({
  model: customModelProvider.getModel(chatModel),
  system: systemPrompt,
  messages: convertToModelMessages(messages),  // 关键转换点
  tools: vercelAITools,
});
```

**转换说明**:
- **UIMessage**: 项目内部使用的消息格式，包含 `id`、`parts`、`metadata` 等字段
- **ModelMessage**: LLM API 标准格式，使用 `role` 和 `content` 字段

#### 2. 提供商特定转换

不同 AI 提供商需要不同的消息格式转换：

##### Anthropic (@ai-sdk/anthropic)
- 文件类型: `type: "file"` → Anthropic 特定格式
- 工具调用: `toolName` → `name`, `args` → `input`
- 流式事件: 解析 Anthropic SSE 格式

##### OpenAI (@ai-sdk/openai)
- 工具调用: 保持 `toolName` 和 `args` 格式
- 函数调用: 支持旧版 function calling 格式
- 流式响应: 处理 OpenAI 特定的 delta 格式

##### Google (@ai-sdk/google)
- 内容块: `content` → `contents[]`
- 工具使用: `function_call` 格式
- 安全过滤: 处理 Google 特定的安全设置

#### 3. 系统提示词构建

**文件**: [prompts.ts](prompts.ts)

```typescript
export const buildUserSystemPrompt = (
  user?: User,
  userPreferences?: UserPreferences,
  agent?: Agent,
) => {
  let prompt = `You are ${assistantName}`;

  // 添加代理角色和指令
  if (agent?.instructions?.systemPrompt) {
    prompt += `\n<core_capabilities>\n${agent.instructions.systemPrompt}\n</core_capabilities>`;
  }

  // 添加用户信息
  if (user?.name) {
    prompt += `\n<user_information>\nName: ${user.name}\n</user_information>`;
  }

  return prompt;
};
```

### 工具系统集成

#### 工具加载流程

工具系统在 [src/app/api/chat/route.ts](../../app/api/chat/route.ts) 中加载：

```typescript
// 1. MCP 工具（外部服务集成）
const MCP_TOOLS = await loadMcpTools({ mentions, allowedMcpServers });

// 2. 工作流工具（自定义工作流）
const WORKFLOW_TOOLS = await loadWorkFlowTools({ mentions, dataStream });

// 3. 默认工具（内置功能）
const APP_DEFAULT_TOOLS = await loadAppDefaultTools({
  mentions,
  allowedAppDefaultToolkit,
});

// 4. 合并所有工具
const vercelAITools = {
  ...MCP_TOOLS,
  ...WORKFLOW_TOOLS,
  ...APP_DEFAULT_TOOLS,
};
```

#### 工具类型定义

```typescript
// Vercel AI SDK 工具格式
type Tool<TInput extends z.ZodTypeAny = z.ZodTypeAny> = {
  description: string;
  inputSchema: TInput;
  execute: (params: z.infer<TInput>) => Promise<any>;
};
```

#### 工具调用生命周期

1. **工具定义**: 工具注册到 `vercelAITools` 对象
2. **发送给 LLM**: 工具定义随消息一起发送给模型
3. **LLM 决策**: 模型决定是否使用工具
4. **执行工具**: AI SDK 调用工具的 `execute` 函数
5. **返回结果**: 工具结果作为新消息发送回 LLM
6. **最终响应**: LLM 基于工具结果生成响应

### 流式响应处理

#### 流式转换

```typescript
// 平滑流式响应
experimental_transform: smoothStream({ chunking: "word" })

// 消费流式响应
result.consumeStream();

// 转换为 UI 消息流
dataStream.merge(
  result.toUIMessageStream({
    messageMetadata: ({ part }) => {
      if (part.type == "finish") {
        metadata.usage = part.totalUsage;
        return metadata;
      }
    },
  })
);
```

#### Server-Sent Events (SSE)

API 使用 SSE 协议将流式响应发送到前端：

```typescript
return new Response(dataStream.value, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### 监控与追踪

#### Langfuse 集成

```typescript
experimental_telemetry: {
  isEnabled: true,  // 发送遥测数据到 Langfuse
}
```

#### Sentry 错误捕获

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // AI 处理逻辑
} catch (error) {
  Sentry.captureException(error);
}
```

## 对外接口

### 模型提供者接口
```typescript
export const customModelProvider = {
  modelsInfo: ModelInfo[],  // 所有可用模型信息
  getModel: (model?: ChatModel) => LanguageModel,  // 获取模型实例
};
```

### 工具系统接口
- `AppDefaultToolkit` - 默认工具集枚举
- `DefaultToolName` - 默认工具名称
- 工具注册和执行机制

### 工作流接口
- `WorkflowExecutor` - 工作流执行器
- `NodeExecutor` - 节点执行器
- 工作流定义和执行 API

## 关键依赖与配置

### 核心依赖
- `@ai-sdk/*` - Vercel AI SDK 系列
- `@modelcontextprotocol/sdk` - MCP SDK
- `ollama-ai-provider-v2` - Ollama 集成
- `@openrouter/ai-sdk-provider` - OpenRouter 集成

### 环境变量配置
```env
# AI 提供商 API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
XAI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=

# MCP 配置
FILE_BASED_MCP_CONFIG=false
```

## 数据模型

### 模型配置
- 支持 30+ 主流 AI 模型
- 动态文件类型支持（图片、文档等）
- 工具调用能力检测

### MCP 配置
- 服务器配置存储（数据库/文件）
- OAuth 认证流程
- 工具自定义指令

### 工具定义
- 统一工具接口
- 参数验证
- 执行结果格式化

## 测试与质量

### 测试覆盖
- 所有核心功能都有对应测试文件
- 使用 Vitest 进行单元测试
- MCP 连接和工具执行测试

### 测试文件示例
- `create-mcp-clients-manager.test.ts`
- `db-mcp-config-storage.test.ts`
- `workflow-executor.test.ts`

## 常见问题 (FAQ)

### Q: 如何添加新的 AI 提供商？
A: 在 `models.ts` 中添加提供商配置，使用相应的 AI SDK。

### Q: MCP 服务器如何添加？
A: 通过 MCP 管理器添加，支持手动配置和 OAuth 认证。

### Q: 自定义工具如何创建？
A: 在 `tools/` 目录下创建新工具，实现标准工具接口。

### Q: 工作流如何调试？
A: 使用工作流执行器的调试模式，查看每个节点的执行状态。

## 相关文件清单

### 核心文件
- `models.ts` - AI 模型管理中心
- `mcp-manager.ts` - MCP 协议集成入口
- `tools/index.ts` - 工具系统定义
- `workflow/executor/workflow-executor.ts` - 工作流执行引擎

### 模型集成
- `create-openai-compatiable.ts` - OpenAI 兼容模型
- `azure-openai-compatible.ts` - Azure OpenAI 集成
- `file-support.ts` - 文件上传支持

### 工具实现
- `tools/code/` - 代码执行工具
- `tools/visualization/` - 数据可视化
- `tools/web/` - 网络相关工具

### MCP 实现
- `mcp/` 目录下的所有文件
- 支持多种存储后端

### 工作流引擎
- `workflow/executor/` - 执行器核心
- `workflow/examples/` - 示例工作流

## 变更记录 (Changelog)

- **2025-12-19**: 创建模块文档
- **最新**: 添加语音聊天支持
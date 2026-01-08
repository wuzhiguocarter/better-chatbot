[根目录](../../../CLAUDE.md) > [src/app](../) > **(chat) 聊天核心模块**

# (chat) 聊天核心模块

## 模块职责

聊天应用的核心功能模块，包含用户聊天界面、代理管理、工作流编辑器、MCP 服务器管理等核心功能。

## 目录结构

```
(chat)/
├── layout.tsx                    # 聊天应用布局
├── page.tsx                     # 聊天主页
├── swr-config.tsx               # SWR 客户端配置
├── agents/                      # 代理管理
│   ├── page.tsx                # 代理列表页
│   └── [id]/page.tsx           # 代理详情页
├── workflow/                    # 工作流管理
│   ├── page.tsx                # 工作流列表页
│   └── [id]/page.tsx           # 工作流编辑器
├── mcp/                         # MCP 服务器管理
│   ├── page.tsx                # MCP 服务器列表
│   ├── create/page.tsx         # 创建 MCP 服务器
│   ├── modify/[id]/page.tsx    # 修改 MCP 服务器
│   └── test/[id]/page.tsx      # 测试 MCP 服务器
├── chat/[thread]/               # 聊天会话
│   ├── page.tsx                # 聊天页面
│   └── loading.tsx             # 加载状态
├── archive/                     # 归档功能
│   └── [id]/page.tsx           # 归档详情页
├── export/                      # 导出功能
│   └── [id]/page.tsx           # 导出的聊天页面
└── (admin)/                     # 管理员功能
    └── admin/users/            # 用户管理
```

## 入口与启动

### 主入口 - page.tsx
```typescript
// 创建新的聊天会话
export default async function HomePage() {
  const session = await getSession();
  const id = generateUUID();
  return <ChatBot initialMessages=[] threadId={id} key={id} />;
}
```

### 布局 - layout.tsx
- 提供聊天应用的侧边栏和主内容区布局
- 集成 SWR 配置
- 管理全局状态

## 对外接口

### 页面路由
- `/` - 聊天主页
- `/chat/[thread]` - 特定聊天会话
- `/agents` - 代理列表
- `/agents/[id]` - 代理详情
- `/workflow` - 工作流列表
- `/workflow/[id]` - 工作流编辑
- `/mcp` - MCP 服务器管理
- `/archive/[id]` - 归档查看
- `/export/[id]` - 导出的聊天分享

### API 集成
- 聊天消息 API：`/api/chat`
- 代理管理 API：`/api/agent`
- 工作流 API：`/api/workflow`
- MCP API：`/api/mcp`
- 用户管理 API：`/api/user`

## 关键依赖与配置

### 主要依赖
- `@ai-sdk/react` - AI 聊天功能
- `swr` - 数据获取
- `zustand` - 状态管理
- `@xyflow/react` - 工作流可视化
- `next-intl` - 国际化

### 配置文件
- `swr-config.tsx` - SWR 全局配置
- `store/index.ts` - Zustand store
- `store/workflow.store.ts` - 工作流状态管理

## 数据模型

### 聊天相关
- **ChatThread** - 聊天会话
- **ChatMessage** - 聊天消息
- **ChatExport** - 导出的聊天
- **Archive** - 聊天归档

### 代理相关
- **Agent** - AI 代理配置
- **Bookmark** - 书签/收藏

### 工作流相关
- **Workflow** - 工作流定义
- **WorkflowNode** - 工作流节点
- **WorkflowEdge** - 工作流边

## 测试与质量

### 测试覆盖
- 用户认证流程
- 聊天功能
- 代理创建和管理
- 权限控制
- MCP 服务器管理

### 相关测试文件
- `tests/agents/` - 代理功能测试
- `tests/auth/` - 认证测试
- `tests/permissions/` - 权限测试

## 常见问题 (FAQ)

### Q: 如何添加新的聊天功能？
A: 在相应目录下添加新组件或页面，确保遵循现有的路由结构和状态管理模式。

### Q: 工作流编辑器如何工作？
A: 使用 `@xyflow/react` 实现拖拽式编辑器，节点和边的数据存储在数据库中。

### Q: MCP 服务器如何集成？
A: 通过 MCP SDK 集成，支持 OAuth 和直接连接两种方式，配置存储在数据库中。

## 相关文件清单

### 核心页面
- `page.tsx` - 聊天主页
- `layout.tsx` - 应用布局
- `swr-config.tsx` - 数据获取配置

### 功能模块
- `agents/` - 代理管理完整功能
- `workflow/` - 工作流编辑和管理
- `mcp/` - MCP 服务器生命周期管理
- `chat/` - 聊天界面和会话管理
- `archive/` - 聊天归档功能
- `(admin)/` - 管理员专用功能

### 数据管理
- `store/` - Zustand 状态管理
- API 调用通过相应的 API 路由处理

## 变更记录 (Changelog)

- **2025-12-19**: 创建模块文档
- **最新**: 添加工作流编辑器支持
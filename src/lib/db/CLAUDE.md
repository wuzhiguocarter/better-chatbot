[根目录](../../../CLAUDE.md) > [src/lib](../../) > **db 数据库模块**

# 数据库模块

## 模块职责

数据持久化层管理，使用 Drizzle ORM 和 PostgreSQL，负责所有实体的数据存储、查询和迁移管理。

## 目录结构

```
db/
├── pg/                           # PostgreSQL 相关
│   ├── schema.pg.ts              # 数据库模式定义
│   └── migrations/               # 数据库迁移文件
│       ├── 0000_past_nebula.sql
│       └── 0001_slimy_tarot.sql
├── index.ts                      # 数据库连接导出
└── connection.ts                 # 数据库连接配置
```

## 入口与启动

### 数据库连接 - connection.ts
- 使用 Drizzle ORM 建立连接
- 支持连接池配置
- 环境变量驱动的连接字符串

### Schema 定义 - schema.pg.ts
包含所有数据表的完整定义，使用 Drizzle 的类型安全 DSL。

## 数据模型

### 核心实体表

#### 用户相关
```sql
-- 用户表
UserTable {
  id: UUID (PK)
  name: Text
  email: Text (Unique)
  emailVerified: Boolean
  password: Text (可选)
  image: Text (头像)
  preferences: Json (用户偏好)
  role: Text (用户角色)
  banned: Boolean (封禁状态)
  banReason: Text (封禁原因)
  banExpires: Timestamp (封禁到期)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- 会话表
SessionTable {
  id: UUID (PK)
  userId: UUID (FK to UserTable)
  token: Text (Unique)
  expiresAt: Timestamp
  ipAddress: Text
  userAgent: Text
  impersonatedBy: Text (管理员模拟)
}
```

#### 聊天相关
```sql
-- 聊天会话表
ChatThreadTable {
  id: UUID (PK)
  title: Text
  userId: UUID (FK to UserTable)
  createdAt: Timestamp
}

-- 聊天消息表
ChatMessageTable {
  id: Text (PK)
  threadId: UUID (FK to ChatThreadTable)
  role: Text (user/assistant/system/tool)
  parts: Json (AI SDK 消息格式)
  metadata: Json (额外元数据)
  createdAt: Timestamp
}

-- 聊天导出表
ChatExportTable {
  id: UUID (PK)
  title: Text
  exporterId: UUID (FK to UserTable)
  originalThreadId: UUID (可选)
  messages: Json (导出的消息)
  exportedAt: Timestamp
  expiresAt: Timestamp (可选过期)
}
```

#### AI 功能相关
```sql
-- AI 代理表
AgentTable {
  id: UUID (PK)
  name: Text
  description: Text
  icon: Json (图标配置)
  userId: UUID (FK to UserTable)
  instructions: Json (系统指令)
  visibility: Enum (public/private/readonly)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- MCP 服务器表
McpServerTable {
  id: UUID (PK)
  name: Text
  config: Json (MCP 配置)
  enabled: Boolean
  userId: UUID (FK to UserTable)
  visibility: Enum (public/private)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- MCP 服务器自定义指令表
McpServerCustomizationTable {
  id: UUID (PK)
  userId: UUID (FK to UserTable)
  mcpServerId: UUID (FK to McpServerTable)
  prompt: Text (自定义提示)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- MCP 工具自定义指令表
McpToolCustomizationTable {
  id: UUID (PK)
  userId: UUID (FK to UserTable)
  mcpServerId: UUID (FK to McpServerTable)
  toolName: Text
  prompt: Text
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 工作流相关
```sql
-- 工作流表
WorkflowTable {
  id: UUID (PK)
  version: Text
  name: Text
  icon: Json (图标)
  description: Text
  isPublished: Boolean
  visibility: Enum (public/private/readonly)
  userId: UUID (FK to UserTable)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- 工作流节点表
WorkflowNodeDataTable {
  id: UUID (PK)
  version: Text
  workflowId: UUID (FK to WorkflowTable)
  kind: Text (节点类型)
  name: Text
  description: Text
  uiConfig: Json (UI 配置)
  nodeConfig: Json (节点配置)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- 工作流边表
WorkflowEdgeTable {
  id: UUID (PK)
  version: Text
  workflowId: UUID (FK to WorkflowTable)
  source: UUID (FK to WorkflowNodeDataTable)
  target: UUID (FK to WorkflowNodeDataTable)
  uiConfig: Json (UI 配置)
  createdAt: Timestamp
}
```

#### 其他功能表
```sql
-- 书签表
BookmarkTable {
  id: UUID (PK)
  userId: UUID (FK to UserTable)
  itemId: UUID
  itemType: Enum (agent/workflow/mcp)
  createdAt: Timestamp
}

-- 归档表
ArchiveTable {
  id: UUID (PK)
  name: Text
  description: Text
  userId: UUID (FK to UserTable)
  createdAt: Timestamp
  updatedAt: Timestamp
}

-- 归档项目表
ArchiveItemTable {
  id: UUID (PK)
  archiveId: UUID (FK to ArchiveTable)
  itemId: UUID
  userId: UUID (FK to UserTable)
  addedAt: Timestamp
}

-- OAuth 会话表（MCP）
McpOAuthSessionTable {
  id: UUID (PK)
  mcpServerId: UUID (FK to McpServerTable)
  serverUrl: Text
  clientInfo: Json
  tokens: Json
  codeVerifier: Text
  state: Text (Unique)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## 对外接口

### 类型导出
所有表都导出对应的实体类型：
- `UserEntity` - 用户实体类型
- `ChatThreadEntity` - 聊天会话类型
- `AgentEntity` - 代理实体类型
- `McpServerEntity` - MCP 服务器类型
- 等...

### 数据库操作
```typescript
// 导出数据库实例
export { db } from './connection';

// 导出所有表定义
export * from './pg/schema';
```

## 关键依赖与配置

### 主要依赖
- `drizzle-orm` - ORM 框架
- `postgres` - PostgreSQL 客户端
- `drizzle-kit` - 数据库工具

### 配置文件
- `drizzle.config.ts` - Drizzle 配置
- 环境变量 `POSTGRES_URL` - 数据库连接字符串

## 数据库迁移

### 迁移管理
```bash
# 生成迁移文件
pnpm db:generate

# 推送 schema 到数据库
pnpm db:push

# 重置数据库（开发环境）
pnpm db:reset

# 打开 Drizzle Studio
pnpm db:studio
```

### 现有迁移
- `0000_past_nebula.sql` - 初始数据结构
- `0001_slimy_tarot.sql` - 功能更新迁移

## 测试与质量

### 测试策略
- 使用测试数据库进行隔离测试
- 自动化测试清理
- 类型安全保证

### 测试相关
- 所有数据操作都包含类型验证
- 使用 Drizzle 的类型推断
- 编译时类型检查

## 常见问题 (FAQ)

### Q: 如何添加新表？
A: 在 `schema.pg.ts` 中定义表结构，然后运行 `pnpm db:generate` 生成迁移。

### Q: 如何修改现有表？
A: 修改 schema 定义，使用 Drizzle 的迁移工具生成变更 SQL。

### Q: 数据库连接池如何配置？
A: 在 `connection.ts` 中配置连接池参数。

### Q: 如何处理软删除？
A: 添加 `deletedAt` 字段，使用 Drizzle 的查询过滤。

## 相关文件清单

### 核心文件
- `schema.pg.ts` - 完整的数据库模式定义
- `connection.ts` - 数据库连接管理
- `index.ts` - 统一导出

### 迁移文件
- `migrations/pg/` - 所有 SQL 迁移文件
- 按时间顺序命名和执行

### 类型定义
- 每个表都导出对应的 Select 类型
- 支持类型安全的数据库操作

## 变更记录 (Changelog)

- **2025-12-19**: 创建模块文档
- **最新**: 添加工作流功能相关表
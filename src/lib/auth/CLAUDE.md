[根目录](../../../CLAUDE.md) > [src/lib](../../) > **auth 认证模块**

# 认证模块

## 模块职责

用户认证和授权系统，基于 Better Auth 实现，支持邮箱密码登录、OAuth 社交登录、会话管理和权限控制。

## 目录结构

```
auth/
├── config.ts                     # 认证配置
├── server.ts                     # 服务端认证实例
├── client.ts                     # 客户端认证配置
├── client-permissions.ts         # 客户端权限检查
├── auth-instance.ts              # 认证实例工厂
├── permissions.ts                # 权限定义和管理
├── permissions.test.ts           # 权限测试
├── roles.ts                      # 角色定义
├── types.ts                      # 认证相关类型
└── config.test.ts                # 配置测试
```

## 入口与启动

### 认证实例 - auth-instance.ts
```typescript
import { betterAuth } from "better-auth";
import { getAuthConfig } from "./config";

export const auth = betterAuth({
  ...getAuthConfig(),
});
```

### 服务端认证 - server.ts
```typescript
export { auth } from "./auth-instance";
export * from "better-auth/types";
export type Session = typeof auth.$Infer.Session;
```

### 客户端认证 - client.ts
```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
```

## 对外接口

### 认证配置 - config.ts
```typescript
export function getAuthConfig(): AuthConfig {
  return {
    emailAndPasswordEnabled: boolean,
    signUpEnabled: boolean,
    socialAuthenticationProviders: {
      github?: GitHubConfig,
      google?: GoogleConfig,
      microsoft?: MicrosoftConfig,
    },
  };
}
```

### 权限系统 - permissions.ts
- 基于资源的权限控制
- 角色权限映射
- 动态权限检查

### 角色定义 - roles.ts
```typescript
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export const rolePermissions = {
  [UserRole.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_ADMIN_PANEL,
    // ...
  ],
  [UserRole.USER]: [
    Permission.CREATE_AGENT,
    Permission.MANAGE_OWN_AGENT,
    // ...
  ],
};
```

## 关键依赖与配置

### 核心依赖
- `better-auth` - 认证框架
- `bcrypt-ts` - 密码加密
- `zod` - 配置验证

### 环境变量配置
```env
# Better Auth
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000

# OAuth 提供商
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# 功能开关
DISABLE_EMAIL_SIGN_IN=false
DISABLE_SIGN_UP=false
```

## 数据模型

### 认证相关表
- **UserTable** - 用户基本信息
- **SessionTable** - 用户会话
- **AccountTable** - OAuth 关联账户
- **VerificationTable** - 邮箱验证

### 权限模型
- 基于角色的访问控制（RBAC）
- 资源级权限控制
- 动态权限检查

## 认证流程

### 邮箱密码登录
1. 用户输入邮箱和密码
2. 服务端验证凭据
3. 创建会话并返回令牌
4. 客户端存储会话

### OAuth 登录流程
1. 用户点击社交登录
2. 重定向到 OAuth 提供商
3. 用户授权后回调
4. 创建或关联用户账户
5. 创建会话

### 会话管理
- 基于 JWT 的会话令牌
- 自动刷新机制
- 多设备登录支持

## 安全特性

### 密码安全
- bcrypt 加密存储
- 密码强度验证
- 防暴力破解

### 会话安全
- 安全的令牌生成
- 会话过期控制
- IP 和 User-Agent 验证

### OAuth 安全
- State 参数验证
- 敏感信息污染防护
- 安全的重定向 URL

## 测试与质量

### 测试覆盖
- `config.test.ts` - 配置验证测试
- `permissions.test.ts` - 权限系统测试

### 安全测试
- 会话劫持防护测试
- 权限绕过测试
- 输入验证测试

## 常见问题 (FAQ)

### Q: 如何添加新的 OAuth 提供商？
A: 在 `config.ts` 中添加新的提供商配置，更新类型定义。

### Q: 自定义权限如何添加？
A: 在 `permissions.ts` 中定义新权限，更新角色权限映射。

### Q: 如何实现自定义认证逻辑？
A: 继承 Better Auth，在中间件中添加自定义逻辑。

### Q: 多租户如何支持？
A: 扩展 User 表添加 tenant 字段，在查询中添加租户过滤。

## 相关文件清单

### 核心文件
- `auth-instance.ts` - 认证实例创建
- `config.ts` - 认证配置管理
- `server.ts` - 服务端导出
- `client.ts` - 客户端配置

### 权限相关
- `permissions.ts` - 权限定义和检查
- `roles.ts` - 角色定义
- `client-permissions.ts` - 客户端权限

### 类型定义
- `types.ts` - 认证相关类型
- 与 `app-types/authentication.ts` 联动

## 集成点

### API 路由
- `/api/auth/[...all]/route.ts` - Better Auth 路由
- 所有需要认证的 API 都使用 `getSession()` 验证

### 前端组件
- `components/auth/` - 认证相关组件
- 使用 `authClient` 进行客户端认证操作

### 中间件
- Next.js 中间件保护路由
- API 路由权限检查

## 变更记录 (Changelog)

- **2025-12-19**: 创建模块文档
- **最新**: 添加管理员模拟功能
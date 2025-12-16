# 模型文件上传配置指南

本文档详细说明了如何在 better-chatbot 中配置不同模型的文件上传支持。

## 实现状态 ✅

**OpenAI兼容模型文件上传配置已完全实现！**

- ✅ Schema扩展完成
- ✅ 模型创建逻辑更新完成
- ✅ 配置文件示例完成
- ✅ 完整测试覆盖
- ✅ 所有测试通过

## 目录

- [概述](#概述)
- [系统架构](#系统架构)
- [配置方法](#配置方法)
- [文件类型支持](#文件类型支持)
- [配置示例](#配置示例)
- [验证和测试](#验证和测试)
- [故障排除](#故障排除)

## 概述

better-chatbot 支持为不同模型配置文件上传功能，包括图片、PDF等文件类型。文件上传支持通过以下两个核心参数控制：

- `isImageInputUnsupported`: 布尔值，控制模型是否支持图片输入
- `supportedFileMimeTypes`: 字符串数组，定义模型支持的文件MIME类型

## 系统架构

### 核心文件

```
src/
├── lib/ai/
│   ├── models.ts          # 模型配置和注册
│   └── file-support.ts    # 文件支持逻辑和常量
├── components/
│   └── prompt-input.tsx   # UI组件，控制文件上传按钮
└── app/api/chat/
    └── models/route.ts    # API端点，提供模型信息
```

### 工作流程

1. **模型注册**: 系统启动时注册所有模型及其文件支持
2. **UI检查**: `prompt-input.tsx` 根据模型配置启用/禁用文件上传
3. **文件验证**: 上传时检查文件类型是否在支持列表中
4. **API处理**: 后端根据模型配置处理文件内容

## 配置方法


### OpenAI兼容模型配置

#### 步骤1: 扩展模型接口

在 `src/lib/ai/models.ts` 中扩展 `OpenAICompatibleModel` 接口：

```typescript
interface OpenAICompatibleModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  // 新增文件支持字段
  isImageInputUnsupported?: boolean;
  supportedFileMimeTypes?: readonly string[];
}
```

#### 步骤2: 更新模型创建逻辑

```typescript
export function createModel(model: OpenAICompatibleModel): ModelInfo {
  const modelInfo: ModelInfo = {
    ...model,
    provider: customModelProvider.providerId,
    supportedFileMimeTypes: model.supportedFileMimeTypes ?? [],
  };

  // 注册文件支持
  if (model.supportedFileMimeTypes) {
    registerFileSupport(modelInfo, model.supportedFileMimeTypes);
  }

  return modelInfo;
}
```

#### 步骤3: 配置OpenAI兼容模型

在 `openai-compatible.config.ts` 中配置：

```typescript
export const OPENAI_COMPATIBLE_DATA = {
  providerId: "custom-provider",
  providerName: "Custom Provider",
  baseUrl: process.env.CUSTOM_API_BASE_URL || "https://api.custom.com/v1",
  apiKey: process.env.CUSTOM_API_KEY,
  models: [
    {
      id: "custom-gpt-4-vision",
      name: "Custom GPT-4 Vision",
      maxTokens: 128000,
      isImageInputUnsupported: false, // 启用图片输入
      supportedFileMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf"
      ]
    },
    {
      id: "custom-gpt-3.5-turbo",
      name: "Custom GPT-3.5 Turbo",
      maxTokens: 16384,
      isImageInputUnsupported: true, // 禁用图片输入
      supportedFileMimeTypes: [] // 无文件支持
    },
    {
      id: "custom-doc-analyzer",
      name: "Custom Document Analyzer",
      maxTokens: 32000,
      isImageInputUnsupported: false,
      supportedFileMimeTypes: [
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ]
    }
  ]
};
``` 
## 文件类型支持

### 预定义MIME类型常量

```typescript
// 默认支持的文件类型
export const DEFAULT_FILE_PART_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
] as const;

// OpenAI 支持的文件类型
export const OPENAI_FILE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;
```

### 常用文件MIME类型

| 文件类型 | MIME类型 | 说明 |
|---------|----------|------|
| JPEG图片 | `image/jpeg` | 常用图片格式 |
| PNG图片 | `image/png` | 支持透明背景 |
| WebP图片 | `image/webp` | 现代图片格式 |
| GIF图片 | `image/gif` | 动图支持 |
| PDF文档 | `application/pdf` | 文档格式 |
| 纯文本 | `text/plain` | 文本文件 |
| CSV表格 | `text/csv` | 逗号分隔值 |
| Excel文件 | `application/vnd.ms-excel` | Excel 97-2003 |
| Excel现代 | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Excel 2007+ |
| Word文档 | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Word 2007+ |
 
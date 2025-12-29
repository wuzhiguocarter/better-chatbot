import { IS_VERCEL_ENV } from "lib/const";

/**
 * Langfuse OpenTelemetry 集成
 *
 * 仅当配置了 Langfuse 环境变量时才启用追踪
 */
let langfuseSpanProcessor:
  | import("@langfuse/otel").LangfuseSpanProcessor
  | null = null;

async function initLangfuseTelemetry() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL;

  if (!publicKey || !secretKey) {
    console.log(
      "[instrumentation] Langfuse telemetry disabled: missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY",
    );
    return;
  }

  try {
    const { LangfuseSpanProcessor } = await import("@langfuse/otel");
    const { NodeTracerProvider } = await import(
      "@opentelemetry/sdk-trace-node"
    );

    // 过滤 Next.js 基础设施 span，只追踪 AI 相关操作
    const shouldExportSpan = (span: any) => {
      return (
        span.otelSpan.instrumentationScope.name !== "next.js" &&
        span.otelSpan.instrumentationScope.name !== "vercel-otel"
      );
    };

    langfuseSpanProcessor = new LangfuseSpanProcessor({
      publicKey,
      secretKey,
      baseUrl: baseUrl || "https://us.cloud.langfuse.com",
      shouldExportSpan,
    });

    const tracerProvider = new NodeTracerProvider({
      spanProcessors: [langfuseSpanProcessor],
    });

    tracerProvider.register();

    console.log(
      `[instrumentation] Langfuse telemetry enabled: ${baseUrl || "https://us.cloud.langfuse.com"}`,
    );
  } catch (error) {
    console.error(
      "[instrumentation] Failed to initialize Langfuse telemetry:",
      error,
    );
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 初始化 Langfuse 追踪
    await initLangfuseTelemetry();

    if (!IS_VERCEL_ENV) {
      // run DB migration
      const runMigrate = await import("./lib/db/pg/migrate.pg").then(
        (m) => m.runMigrate,
      );
      await runMigrate().catch((e) => {
        console.error(e);
        process.exit(1);
      });
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager();
    }
  }
}

/**
 * 导出 langfuseSpanProcessor 供 API 路由使用
 * 用于在请求完成后手动刷新 span 数据
 */
export { langfuseSpanProcessor };

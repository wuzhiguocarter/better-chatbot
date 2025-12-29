#!/usr/bin/env tsx
/**
 * Langfuse Trace 上报测试脚本
 *
 * 用于验证 Langfuse 集成是否正常工作
 */

import "dotenv/config";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  startActiveObservation,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";

async function testLangfuse() {
  console.log("🔍 开始测试 Langfuse trace 上报...\n");

  // 1. 检查环境变量
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL;

  console.log("📋 环境变量检查:");
  console.log(
    `  - LANGFUSE_PUBLIC_KEY: ${publicKey ? "✅ 已设置" : "❌ 未设置"}`,
  );
  console.log(
    `  - LANGFUSE_SECRET_KEY: ${secretKey ? "✅ 已设置" : "❌ 未设置"}`,
  );
  console.log(`  - LANGFUSE_BASE_URL: ${baseUrl || "使用默认值"}`);

  if (!publicKey || !secretKey) {
    console.error(
      "\n❌ 错误: 请设置 LANGFUSE_PUBLIC_KEY 和 LANGFUSE_SECRET_KEY 环境变量",
    );
    process.exit(1);
  }

  try {
    // 2. 初始化 Langfuse OTel
    console.log("\n🔧 初始化 Langfuse OTel...");

    const shouldExportSpan = (_span: any) => {
      return true; // 测试时导出所有 span
    };

    const langfuseSpanProcessor = new LangfuseSpanProcessor({
      publicKey,
      secretKey,
      baseUrl: baseUrl || "https://us.cloud.langfuse.com",
      shouldExportSpan,
    });

    const tracerProvider = new NodeTracerProvider({
      spanProcessors: [langfuseSpanProcessor],
    });

    tracerProvider.register();

    console.log("✅ Langfuse OTel 初始化成功");

    // 3. 创建测试 trace
    console.log("\n📊 创建测试 trace...");

    const testUserId = "test-user-" + Date.now();
    const testSessionId = "test-session-" + Date.now();

    await startActiveObservation(
      "test-observation",
      async () => {
        // 更新 trace 信息
        updateActiveTrace({
          name: "langfuse-integration-test",
          userId: testUserId,
          sessionId: testSessionId,
          input: "Hello, this is a test message!",
          metadata: {
            environment: "test",
            framework: "nextjs",
            testType: "integration",
          },
        });

        // 更新 observation 信息
        updateActiveObservation({
          input: "Test input data",
          metadata: {
            model: "test-model",
            version: "1.0.0",
          },
        });

        console.log(`  - Trace ID: ${testSessionId}`);
        console.log(`  - User ID: ${testUserId}`);

        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 更新输出
        updateActiveObservation({
          output: "Test output data",
        });

        updateActiveTrace({
          output: "Test completed successfully",
        });
      },
      {
        endOnExit: true,
      },
    );

    console.log("✅ Trace 创建成功");

    // 4. 手动刷新 span 数据
    console.log("\n🔄 刷新 span 数据到 Langfuse...");
    await langfuseSpanProcessor.forceFlush();
    console.log("✅ 数据刷新成功");

    // 5. 输出结果
    console.log("\n" + "=".repeat(60));
    console.log("✅ Langfuse trace 上报测试完成！");
    console.log("=".repeat(60));
    console.log(`\n📖 请在 Langfuse Dashboard 中查看 trace 数据:`);
    console.log(`   - Trace ID: ${testSessionId}`);
    console.log(`   - User ID: ${testUserId}`);
    console.log(
      `   - Dashboard URL: ${baseUrl || "https://us.cloud.langfuse.com"}`,
    );

    console.log("\n💡 提示:");
    console.log("   - 如果在 Dashboard 中看到 trace，说明集成正常");
    console.log("   - 如果没有看到，请检查网络连接和 API 密钥");
    console.log("   - 等待几秒后刷新 Dashboard，数据可能有延迟\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

testLangfuse();

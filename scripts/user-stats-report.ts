/**
 * 用户聊天统计报表脚本
 *
 * 统计维度：
 * 1. 注册用户总数
 * 2. 活跃用户数（有对话记录）
 * 3. 日活用户数（每天至少1条消息）
 * 4. 每个用户分别开启了多少会话
 * 5. 每个用户累计对话轮次
 * 6. 每个用户平均每次会话有多少轮次
 */

import pg from "pg";
import Table from "cli-table3";

const { Client } = pg;

// 数据库连接配置
const dbConfig = {
  host: "81.70.184.94",
  port: 5432,
  database: "better_chatbot_wuzhiguo",
  user: "better_chatbot_user",
  password: "better_chatbot_password",
};

async function generateUserStatsReport() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log("✅ 数据库连接成功\n");

    // 查询1: 注册用户总数
    const totalRegisteredUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM "user"',
    );
    const totalRegisteredUsers = parseInt(
      totalRegisteredUsersResult.rows[0].count,
    );

    // 查询2: 活跃用户数（有对话记录）
    const activeUsersResult = await client.query(`
      SELECT COUNT(DISTINCT ct.user_id) as count
      FROM chat_thread ct
      INNER JOIN chat_message cm ON cm.thread_id = ct.id
    `);
    const activeUsersCount = parseInt(activeUsersResult.rows[0].count);

    // 查询3: 日活用户数（每天至少1条消息的用户数的平均值）
    const dailyActiveUsersResult = await client.query(`
      WITH daily_user_counts AS (
        SELECT
          DATE(cm.created_at) as activity_date,
          COUNT(DISTINCT ct.user_id) as daily_active_users
        FROM chat_message cm
        INNER JOIN chat_thread ct ON cm.thread_id = ct.id
        GROUP BY DATE(cm.created_at)
      )
      SELECT
        ROUND(AVG(daily_active_users)::numeric, 1) as avg_daily_active_users,
        COUNT(*) as total_days_with_activity,
        MIN(activity_date) as first_activity_date,
        MAX(activity_date) as last_activity_date
      FROM daily_user_counts
    `);
    const dauStats = dailyActiveUsersResult.rows[0];
    const avgDailyActiveUsers = parseFloat(
      dauStats.avg_daily_active_users || 0,
    );
    const totalDaysWithActivity = parseInt(
      dauStats.total_days_with_activity || 0,
    );
    const firstActivityDate = dauStats.first_activity_date;
    const lastActivityDate = dauStats.last_activity_date;

    // 查询4: 用户详细统计
    const query = `
      WITH user_stats AS (
        SELECT
          u.id,
          u.name,
          u.email,
          u.created_at as user_created_at,
          (SELECT COUNT(*) FROM chat_thread ct WHERE ct.user_id = u.id) as total_threads,
          (SELECT COUNT(*) FROM chat_thread ct
           JOIN chat_message cm ON cm.thread_id = ct.id
           WHERE ct.user_id = u.id) as total_messages,
          -- 最后活跃时间
          (SELECT MAX(cm.created_at)
           FROM chat_thread ct
           JOIN chat_message cm ON cm.thread_id = ct.id
           WHERE ct.user_id = u.id) as last_active_at
        FROM "user" u
      )
      SELECT
        id as user_id,
        name,
        email,
        total_threads,
        total_messages,
        CASE
          WHEN total_messages > 0 THEN total_messages / 2.0
          ELSE 0
        END as conversation_rounds,
        CASE
          WHEN total_threads > 0 THEN ROUND((total_messages / 2.0) / total_threads::numeric, 2)
          ELSE 0
        END as avg_rounds_per_thread,
        user_created_at,
        last_active_at,
        -- 计算活跃天数（有消息的天数）
        (SELECT COUNT(DISTINCT DATE(cm.created_at))
         FROM chat_thread ct
         JOIN chat_message cm ON cm.thread_id = ct.id
         WHERE ct.user_id = user_stats.id) as active_days
      FROM user_stats
      WHERE total_threads > 0 OR total_messages > 0
      ORDER BY total_messages DESC;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log("📊 暂无数据");
      return;
    }

    // 汇总统计
    const totalThreads = result.rows.reduce(
      (sum, row) => sum + parseInt(row.total_threads),
      0,
    );
    const totalMessages = result.rows.reduce(
      (sum, row) => sum + parseInt(row.total_messages),
      0,
    );
    const totalRounds = result.rows.reduce(
      (sum, row) => sum + parseFloat(row.conversation_rounds),
      0,
    );
    const avgRoundsAllUsers =
      totalThreads > 0 ? (totalRounds / totalThreads).toFixed(2) : 0;
    const activationRate =
      totalRegisteredUsers > 0
        ? ((activeUsersCount / totalRegisteredUsers) * 100).toFixed(1)
        : 0;

    console.log("═══════════════════════════════════════════════════════");
    console.log("📊 Better Chatbot 用户聊天统计报表");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("📈 整体汇总:");
    console.log(`  • 注册用户总数: ${totalRegisteredUsers}`);
    console.log(
      `  • 活跃用户数: ${activeUsersCount} (激活率: ${activationRate}%)`,
    );
    console.log(`  • 平均日活(DAU): ${avgDailyActiveUsers}`);
    console.log(`  • 活跃天数: ${totalDaysWithActivity} 天`);
    console.log(`  • 活动周期: ${firstActivityDate} ~ ${lastActivityDate}`);
    console.log(`  • 会话总数: ${totalThreads}`);
    console.log(`  • 消息总数: ${totalMessages}`);
    console.log(`  • 对话轮次: ${Math.round(totalRounds)}`);
    console.log(`  • 全局平均每会话轮次: ${avgRoundsAllUsers}\n`);

    // 创建详细表格
    const table = new Table({
      head: [
        "用户名",
        "会话数",
        "消息数",
        "对话轮次",
        "平均轮次/会话",
        "活跃天数",
        "注册时间",
        "最后活跃",
      ],
      colWidths: [18, 8, 8, 10, 12, 10, 14, 18],
      wordWrap: true,
      style: {
        head: ["cyan", "bold"],
        border: ["grey"],
      },
    });

    result.rows.forEach((row) => {
      const lastActive = row.last_active_at
        ? new Date(row.last_active_at).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "无";
      table.push([
        row.name || "未命名",
        row.total_threads,
        row.total_messages,
        Math.round(row.conversation_rounds),
        row.avg_rounds_per_thread,
        row.active_days || 0,
        new Date(row.user_created_at).toLocaleDateString("zh-CN"),
        lastActive,
      ]);
    });

    console.log("📋 用户详细统计:");
    console.log(table.toString());

    // 输出 Markdown 表格（便于复制）
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("📄 Markdown 格式（可复制到文档）:");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(
      "| 用户名 | 会话数 | 消息数 | 对话轮次 | 平均轮次/会话 | 活跃天数 | 注册时间 | 最后活跃 |",
    );
    console.log(
      "|--------|--------|--------|----------|---------------|----------|----------|----------|",
    );
    result.rows.forEach((row) => {
      const regDate = new Date(row.user_created_at).toLocaleDateString("zh-CN");
      const lastActive = row.last_active_at
        ? new Date(row.last_active_at).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "无";
      console.log(
        `| ${row.name || "未命名"} | ${row.total_threads} | ${row.total_messages} | ${Math.round(row.conversation_rounds)} | ${row.avg_rounds_per_thread} | ${row.active_days || 0} | ${regDate} | ${lastActive} |`,
      );
    });

    // 输出 CSV 格式（便于导入 Excel）
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("📊 CSV 格式（可导入 Excel）:");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(
      "用户名,邮箱,会话数,消息数,对话轮次,平均轮次/会话,活跃天数,注册时间,最后活跃",
    );
    result.rows.forEach((row) => {
      const regDate = new Date(row.user_created_at).toLocaleDateString("zh-CN");
      const lastActive = row.last_active_at
        ? new Date(row.last_active_at).toLocaleString("zh-CN")
        : "无";
      console.log(
        `"${row.name || "未命名"}","${row.email}",${row.total_threads},${row.total_messages},${Math.round(row.conversation_rounds)},${row.avg_rounds_per_thread},${row.active_days || 0},"${regDate}","${lastActive}"`,
      );
    });
  } catch (error) {
    console.error(
      "❌ 执行出错:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && "code" in error) {
      if (error.code === "ECONNREFUSED") {
        console.error("💡 提示: 请检查数据库连接地址和端口是否正确");
      } else if (error.code === "3D000") {
        console.error("💡 提示: 数据库不存在");
      } else if (error.code === "28P01") {
        console.error("💡 提示: 用户名或密码错误");
      }
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n✅ 报表生成完成");
  }
}

// 执行报表生成
generateUserStatsReport();

/**
 * 生成 HTML 仪表盘脚本
 *
 * 基于用户统计数据生成精美的可视化仪表盘
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接配置
const dbConfig = {
  host: "81.70.184.94",
  port: 5432,
  database: "better_chatbot_wuzhiguo",
  user: "better_chatbot_user",
  password: "better_chatbot_password",
};

interface UserStats {
  user_id: string;
  name: string;
  email: string;
  total_threads: number;
  total_messages: number;
  conversation_rounds: number;
  avg_rounds_per_thread: number;
  user_created_at: Date;
  last_active_at: Date;
  active_days: number;
}

// Token统计相关接口
interface TokenUsageStats {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  message_count: number;
}

interface OverallTokenStats {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  messages_with_usage: number;
  avg_tokens_per_message: string;
}

interface DashboardData {
  totalRegisteredUsers: number;
  activeUsersCount: number;
  avgDailyActiveUsers: number;
  totalDaysWithActivity: number;
  firstActivityDate: string;
  lastActivityDate: string;
  totalThreads: number;
  totalMessages: number;
  totalRounds: number;
  avgRoundsAllUsers: string;
  activationRate: string;
  userStats: UserStats[];
  dailyUserStats: UserStats[];
  dailyStats: Array<{ date: string; active_users: number; messages: number }>;
  // 新增Token统计字段
  dailyTokenStats: TokenUsageStats[];
  overallTokenStats: OverallTokenStats;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    // 查询1: 注册用户总数
    const totalRegisteredUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM "user"',
    );
    const totalRegisteredUsers = parseInt(
      totalRegisteredUsersResult.rows[0].count,
    );

    // 查询2: 活跃用户数
    const activeUsersResult = await client.query(`
      SELECT COUNT(DISTINCT ct.user_id) as count
      FROM chat_thread ct
      INNER JOIN chat_message cm ON cm.thread_id = ct.id
    `);
    const activeUsersCount = parseInt(activeUsersResult.rows[0].count);

    // 查询3: 日活用户数
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

    // 查询4: 每日统计数据
    const dailyStatsResult = await client.query(`
      SELECT
        DATE(cm.created_at) as date,
        COUNT(DISTINCT ct.user_id) as active_users,
        COUNT(*) as messages
      FROM chat_message cm
      INNER JOIN chat_thread ct ON cm.thread_id = ct.id
      GROUP BY DATE(cm.created_at)
      ORDER BY date ASC
    `);
    const dailyStats = dailyStatsResult.rows.map((row) => ({
      date: row.date,
      active_users: parseInt(row.active_users),
      messages: parseInt(row.messages),
    }));

    // 查询5: 用户详细统计
    const userStatsResult = await client.query(`
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
        (SELECT COUNT(DISTINCT DATE(cm.created_at))
         FROM chat_thread ct
         JOIN chat_message cm ON cm.thread_id = ct.id
         WHERE ct.user_id = user_stats.id) as active_days
      FROM user_stats
      WHERE total_threads > 0 OR total_messages > 0
      ORDER BY total_messages DESC;
    `);
    const userStats = userStatsResult.rows;

    // 查询6: 当日用户详细统计
    const dailyUserStatsResult = await client.query(`
      WITH user_stats AS (
        SELECT
          u.id,
          u.name,
          u.email,
          u.created_at as user_created_at,
          (SELECT COUNT(*) FROM chat_thread ct WHERE ct.user_id = u.id AND DATE(ct.created_at) = CURRENT_DATE) as total_threads,
          (SELECT COUNT(*) FROM chat_thread ct
           JOIN chat_message cm ON cm.thread_id = ct.id
           WHERE ct.user_id = u.id AND DATE(cm.created_at) = CURRENT_DATE) as total_messages,
          (SELECT MAX(cm.created_at)
           FROM chat_thread ct
           JOIN chat_message cm ON cm.thread_id = ct.id
           WHERE ct.user_id = u.id AND DATE(cm.created_at) = CURRENT_DATE) as last_active_at
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
        0 as active_days
      FROM user_stats
      WHERE total_threads > 0 OR total_messages > 0
      ORDER BY total_messages DESC;
    `);
    const dailyUserStats = dailyUserStatsResult.rows;

    // 查询7: 每日Token用量统计（最近30天）
    const dailyTokenStatsResult = await client.query(`
      WITH daily_token_usage AS (
        SELECT
          DATE(cm.created_at) as date,
          SUM(
            COALESCE(
              (cm.metadata->'usage'->>'inputTokens')::bigint,
              0
            )
          ) as input_tokens,
          SUM(
            COALESCE(
              (cm.metadata->'usage'->>'outputTokens')::bigint,
              0
            )
          ) as output_tokens,
          SUM(
            COALESCE(
              (cm.metadata->'usage'->>'totalTokens')::bigint,
              0
            )
          ) as total_tokens,
          COUNT(*) as message_count
        FROM chat_message cm
        WHERE cm.role = 'assistant'
          AND cm.metadata IS NOT NULL
          AND cm.metadata->'usage' IS NOT NULL
          AND cm.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(cm.created_at)
      )
      SELECT
        date,
        input_tokens,
        output_tokens,
        total_tokens,
        message_count
      FROM daily_token_usage
      ORDER BY date ASC
    `);

    // 查询8: 总体Token统计
    const overallTokenResult = await client.query(`
      SELECT
        SUM(
          COALESCE(
            (metadata->'usage'->>'totalTokens')::bigint,
            0
          )
        ) as total_tokens,
        SUM(
          COALESCE(
            (metadata->'usage'->>'inputTokens')::bigint,
            0
          )
        ) as total_input_tokens,
        SUM(
          COALESCE(
            (metadata->'usage'->>'outputTokens')::bigint,
            0
          )
        ) as total_output_tokens,
        COUNT(*) FILTER (
          WHERE metadata->'usage' IS NOT NULL
        ) as messages_with_usage
      FROM chat_message
      WHERE role = 'assistant'
        AND metadata IS NOT NULL
    `);

    // 汇总统计
    const totalThreads = userStats.reduce(
      (sum, row) => sum + parseInt(row.total_threads),
      0,
    );
    const totalMessages = userStats.reduce(
      (sum, row) => sum + parseInt(row.total_messages),
      0,
    );
    const totalRounds = userStats.reduce(
      (sum, row) => sum + parseFloat(row.conversation_rounds),
      0,
    );
    const avgRoundsAllUsers =
      totalThreads > 0 ? (totalRounds / totalThreads).toFixed(2) : "0";
    const activationRate =
      totalRegisteredUsers > 0
        ? ((activeUsersCount / totalRegisteredUsers) * 100).toFixed(1)
        : "0";

    return {
      totalRegisteredUsers,
      activeUsersCount,
      avgDailyActiveUsers,
      totalDaysWithActivity,
      firstActivityDate,
      lastActivityDate,
      totalThreads,
      totalMessages,
      totalRounds,
      avgRoundsAllUsers,
      activationRate,
      userStats: userStats as unknown as UserStats[],
      dailyUserStats: dailyUserStats as unknown as UserStats[],
      dailyStats,
      // 新增Token统计数据
      dailyTokenStats: dailyTokenStatsResult.rows.map((row) => ({
        date: row.date,
        input_tokens: parseInt(row.input_tokens || 0),
        output_tokens: parseInt(row.output_tokens || 0),
        total_tokens: parseInt(row.total_tokens || 0),
        message_count: parseInt(row.message_count || 0),
      })),
      overallTokenStats: {
        total_tokens: parseInt(overallTokenResult.rows[0].total_tokens || 0),
        total_input_tokens: parseInt(
          overallTokenResult.rows[0].total_input_tokens || 0,
        ),
        total_output_tokens: parseInt(
          overallTokenResult.rows[0].total_output_tokens || 0,
        ),
        messages_with_usage: parseInt(
          overallTokenResult.rows[0].messages_with_usage || 0,
        ),
        avg_tokens_per_message: overallTokenResult.rows[0].messages_with_usage
          ? (
              parseInt(overallTokenResult.rows[0].total_tokens || 0) /
              parseInt(overallTokenResult.rows[0].messages_with_usage || 1)
            ).toFixed(1)
          : "0",
      },
    };
  } finally {
    await client.end();
  }
}

function generateHTML(data: DashboardData): string {
  const {
    userStats,
    dailyUserStats,
    dailyStats,
    dailyTokenStats,
    overallTokenStats,
  } = data;

  // 生成图表数据 - 简化日期格式
  const dates = dailyStats
    .map((s) => {
      const d = new Date(s.date);
      return `"${d.getMonth() + 1}/${d.getDate()}"`;
    })
    .join(",");
  const activeUsersData = dailyStats.map((s) => s.active_users).join(",");
  const messagesData = dailyStats.map((s) => s.messages).join(",");

  // 用户排行数据
  const topUsers = userStats.slice(0, 10);
  const userLabels = topUsers.map((u) => `"${u.name || "未命名"}"`).join(",");
  const userMessagesData = topUsers.map((u) => u.total_messages).join(",");
  const userRoundsData = topUsers
    .map((u) => Math.round(u.conversation_rounds))
    .join(",");

  // Token趋势图表数据
  const tokenDates = dailyTokenStats
    .map((s) => {
      const d = new Date(s.date);
      return `"${d.getMonth() + 1}/${d.getDate()}"`;
    })
    .join(",");
  const inputTokensData = dailyTokenStats.map((s) => s.input_tokens).join(",");
  const outputTokensData = dailyTokenStats
    .map((s) => s.output_tokens)
    .join(",");

  // 用户表格行
  const tableRows = userStats
    .map((user) => {
      const lastActive = user.last_active_at
        ? new Date(user.last_active_at).toLocaleString("zh-CN")
        : "无";
      return `
      <tr>
        <td>${user.name || "未命名"}</td>
        <td>${user.email}</td>
        <td><span class="badge badge-primary">${user.total_threads}</span></td>
        <td><span class="badge badge-info">${user.total_messages}</span></td>
        <td><span class="badge badge-success">${Math.round(user.conversation_rounds)}</span></td>
        <td>${user.avg_rounds_per_thread}</td>
        <td>${user.active_days || 0}</td>
        <td>${new Date(user.user_created_at).toLocaleDateString("zh-CN")}</td>
        <td>${lastActive}</td>
      </tr>
    `;
    })
    .join("");

  // 当日用户表格行
  const todayDate = new Date().toLocaleDateString("zh-CN");
  const dailyTableRows = dailyUserStats
    .map((user) => {
      const lastActive = user.last_active_at
        ? new Date(user.last_active_at).toLocaleString("zh-CN")
        : "无";
      return `
      <tr>
        <td>${user.name || "未命名"}</td>
        <td>${user.email}</td>
        <td><span class="badge badge-primary">${user.total_threads}</span></td>
        <td><span class="badge badge-info">${user.total_messages}</span></td>
        <td><span class="badge badge-success">${Math.round(user.conversation_rounds)}</span></td>
        <td>${user.avg_rounds_per_thread}</td>
        <td>${new Date(user.user_created_at).toLocaleDateString("zh-CN")}</td>
        <td>${lastActive}</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Better Chatbot - 数据统计仪表盘</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      min-height: 100vh;
      padding: 20px;
      color: #333;
    }

    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      color: white;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 25px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    }

    .stat-card.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-card.success {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .stat-card.info {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }

    .stat-card.warning {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: white;
    }

    .stat-label {
      font-size: 0.85rem;
      opacity: 0.8;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .stat-sub {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-top: 5px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 25px;
      margin-bottom: 30px;
    }

    .chart-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 25px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .chart-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }

    .chart-container {
      position: relative;
      height: 300px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(245, 87, 108, 0.05) 100%);
      border-radius: 12px;
      padding: 15px;
    }

    .chart-container canvas {
      max-height: 100%;
      width: 100% !important;
    }

    .loading-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    .table-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 25px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin-bottom: 30px;
    }

    .table-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
    }

    th:first-child {
      border-top-left-radius: 10px;
    }

    th:last-child {
      border-top-right-radius: 10px;
    }

    td {
      padding: 12px 15px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.9rem;
    }

    tr:hover {
      background: #f8f9ff;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .badge-primary {
      background: #667eea;
      color: white;
    }

    .badge-info {
      background: #4facfe;
      color: white;
    }

    .badge-success {
      background: #00f2fe;
      color: white;
    }

    .footer {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 40px;
      padding: 20px;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .charts-grid {
        grid-template-columns: 1fr;
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <script src="./chart.umd.min.js"></script>
  <div class="dashboard">
    <div class="header">
      <h1>🤖 科邦超级销售助理——数据统计仪表盘</h1>
      <p>实时监控用户活跃度与对话数据</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-label">注册用户总数</div>
        <div class="stat-value">${data.totalRegisteredUsers}</div>
        <div class="stat-sub">系统累计注册</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">活跃用户数</div>
        <div class="stat-value">${data.activeUsersCount}</div>
        <div class="stat-sub">激活率: ${data.activationRate}%</div>
      </div>
      <div class="stat-card info">
        <div class="stat-label">平均日活 DAU</div>
        <div class="stat-value">${data.avgDailyActiveUsers}</div>
        <div class="stat-sub">活跃天数: ${data.totalDaysWithActivity} 天</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">会话总数</div>
        <div class="stat-value">${data.totalThreads}</div>
        <div class="stat-sub">消息: ${data.totalMessages} | 轮次: ${Math.round(data.totalRounds)}</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white;">
        <div class="stat-label">总Token消耗</div>
        <div class="stat-value">${(() => {
          const num = overallTokenStats.total_tokens;
          if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
          if (num >= 1000) return (num / 1000).toFixed(1) + "K";
          return num.toString();
        })()}</div>
        <div class="stat-sub">输入: ${(() => {
          const num = overallTokenStats.total_input_tokens;
          if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
          if (num >= 1000) return (num / 1000).toFixed(1) + "K";
          return num.toString();
        })()} | 输出: ${(() => {
          const num = overallTokenStats.total_output_tokens;
          if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
          if (num >= 1000) return (num / 1000).toFixed(1) + "K";
          return num.toString();
        })()}</div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">📈 每日活跃趋势</div>
        <div class="chart-container" id="dailyTrendContainer">
          <div class="loading-spinner"></div>
          <canvas id="dailyTrendChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">👥 用户排行 Top 10</div>
        <div class="chart-container" id="userRankContainer">
          <div class="loading-spinner"></div>
          <canvas id="userRankChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Token用量趋势图表区域 -->
    <div class="charts-grid" style="grid-template-columns: 1fr;">
      <div class="chart-card">
        <div class="chart-title">🔥 每日Token用量趋势（最近30天）</div>
        <div class="chart-container" id="tokenUsageContainer">
          <div class="loading-spinner"></div>
          <canvas id="tokenUsageChart"></canvas>
        </div>
      </div>
    </div>

    <!-- 当日用户详细表格 -->
    <div class="table-card">
      <div class="table-title">📋 当日用户详细统计 (${dailyUserStats.length} 位活跃用户) - ${todayDate}</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>会话数</th>
              <th>消息数</th>
              <th>对话轮次</th>
              <th>平均轮次/会话</th>
              <th>注册时间</th>
              <th>最后活跃</th>
            </tr>
          </thead>
          <tbody>
            ${dailyTableRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 用户详细表格 -->
    <div class="table-card">
      <div class="table-title">📋 用户详细统计 (${userStats.length} 位活跃用户)</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>会话数</th>
              <th>消息数</th>
              <th>对话轮次</th>
              <th>平均轮次/会话</th>
              <th>活跃天数</th>
              <th>注册时间</th>
              <th>最后活跃</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>📊 数据生成时间: ${new Date().toLocaleString("zh-CN")} | 活动周期: ${data.firstActivityDate} ~ ${data.lastActivityDate}</p>
      <p>Better Chatbot © 2025 - 数据统计仪表盘</p>
    </div>
  </div>

  <script>
    // 等待页面加载完成
    document.addEventListener('DOMContentLoaded', function() {
      // 移除加载动画
      function hideSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
          const spinner = container.querySelector('.loading-spinner');
          if (spinner) {
            spinner.style.display = 'none';
          }
        }
      }

      // 全局图表配置
      Chart.defaults.color = '#666';
      Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      // 每日活跃趋势图
      const dailyTrendChart = new Chart(document.getElementById('dailyTrendChart'), {
      type: 'line',
      data: {
        labels: [${dates}],
        datasets: [{
          label: '活跃用户数',
          data: [${activeUsersData}],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        }, {
          label: '消息数',
          data: [${messagesData}],
          borderColor: '#f5576c',
          backgroundColor: 'rgba(245, 87, 108, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '活跃用户数'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '消息数'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    });
    hideSpinner('dailyTrendContainer');

    // 用户排行柱状图
    const userRankChart = new Chart(document.getElementById('userRankChart'), {
      type: 'bar',
      data: {
        labels: [${userLabels}],
        datasets: [{
          label: '消息数',
          data: [${userMessagesData}],
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderRadius: 8,
        }, {
          label: '对话轮次',
          data: [${userRoundsData}],
          backgroundColor: 'rgba(245, 87, 108, 0.8)',
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        }
      }
    });
    hideSpinner('userRankContainer');

    // 数字格式化函数（K/M单位）
    function formatNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      } else {
        return num.toString();
      }
    }

    // 每日Token用量趋势图
    const tokenUsageChart = new Chart(document.getElementById('tokenUsageChart'), {
      type: 'line',
      data: {
        labels: [${tokenDates}],
        datasets: [
          {
            label: '输入Token',
            data: [${inputTokensData}],
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: '输出Token',
            data: [${outputTokensData}],
            borderColor: '#f5576c',
            backgroundColor: 'rgba(245, 87, 108, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatNumber(context.parsed.y);
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '输入Token'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return formatNumber(value);
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '输出Token'
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: function(value) {
                return formatNumber(value);
              }
            }
          }
        }
      }
    });
    hideSpinner('tokenUsageContainer');
    });
  </script>
</body>
</html>`;
}

async function main() {
  try {
    console.log("📊 正在获取统计数据...\n");

    const data = await fetchDashboardData();

    console.log(`✅ 数据获取成功:`);
    console.log(`   - 注册用户: ${data.totalRegisteredUsers}`);
    console.log(`   - 活跃用户: ${data.activeUsersCount}`);
    console.log(`   - 平均日活: ${data.avgDailyActiveUsers}`);

    // 生成 HTML
    const html = generateHTML(data);

    // 确保输出目录存在
    const outputDir = path.join(__dirname, "../public/dashboard");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 写入文件
    const outputFile = path.join(outputDir, "index.html");
    fs.writeFileSync(outputFile, html, "utf-8");

    console.log(`\n✅ HTML 仪表盘已生成: ${outputFile}`);
    console.log(`📂 本地访问: file://${outputFile}`);

    // 如果是开发服务器环境，给出访问提示
    console.log(
      `\n💡 提示: 运行 \`pnpm dev\` 后访问 http://localhost:3000/dashboard/index.html`,
    );
  } catch (error) {
    console.error(
      "❌ 生成失败:",
      error instanceof Error ? error.message : String(error),
    );
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ECONNREFUSED"
    ) {
      console.error("💡 提示: 请检查数据库连接地址和端口是否正确");
    }
    process.exit(1);
  }
}

main();

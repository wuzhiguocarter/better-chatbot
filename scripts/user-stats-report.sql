-- 用户聊天统计报表
-- 统计每个用户的会话数、对话轮次、平均轮次

WITH user_stats AS (
    SELECT
        u.id,
        u.name,
        u.email,
        u.created_at as user_created_at,
        -- 统计每个用户的会话数
        (SELECT COUNT(*) FROM chat_thread ct WHERE ct.user_id = u.id) as total_threads,
        -- 统计每个用户的累计消息数
        (SELECT COUNT(*) FROM chat_thread ct
         JOIN chat_message cm ON cm.thread_id = ct.id
         WHERE ct.user_id = u.id) as total_messages
    FROM "user" u
)
SELECT
    id as "用户ID",
    name as "用户名",
    email as "邮箱",
    total_threads as "会话总数",
    total_messages as "消息总数",
    CASE
        WHEN total_messages > 0 THEN total_messages / 2.0
        ELSE 0
    END as "对话轮次(消息数/2)",
    CASE
        WHEN total_threads > 0 THEN ROUND((total_messages / 2.0) / total_threads::numeric, 2)
        ELSE 0
    END as "平均每会话轮次",
    user_created_at as "注册时间"
FROM user_stats
WHERE total_threads > 0 OR total_messages > 0
ORDER BY total_messages DESC;

import { ChatMessage, ChatRepository, ChatThread } from "app-types/chat";

import { pgDb as db } from "../db.pg";
import {
  ArchiveItemTable,
  EvalTaskChatMessageTable,
  EvalTaskChatThreadTable,
  UserTable,
} from "../schema.pg";

import { and, desc, eq, gte, sql } from "drizzle-orm";

export const pgEvalTaskChatRepository: ChatRepository = {
  insertThread: async (
    thread: Omit<ChatThread, "createdAt">,
  ): Promise<ChatThread> => {
    const [result] = await db
      .insert(EvalTaskChatThreadTable)
      .values({
        title: thread.title,
        userId: thread.userId,
        id: thread.id,
      })
      .returning();
    return result;
  },

  deleteChatMessage: async (id: string): Promise<void> => {
    await db
      .delete(EvalTaskChatMessageTable)
      .where(eq(EvalTaskChatMessageTable.id, id));
  },

  selectThread: async (id: string): Promise<ChatThread | null> => {
    const [result] = await db
      .select()
      .from(EvalTaskChatThreadTable)
      .where(eq(EvalTaskChatThreadTable.id, id));
    return result;
  },

  selectThreadDetails: async (id: string) => {
    if (!id) {
      return null;
    }
    const [thread] = await db
      .select()
      .from(EvalTaskChatThreadTable)
      .leftJoin(UserTable, eq(EvalTaskChatThreadTable.userId, UserTable.id))
      .where(eq(EvalTaskChatThreadTable.id, id));

    if (!thread) {
      return null;
    }

    const messages =
      await pgEvalTaskChatRepository.selectMessagesByThreadId(id);
    return {
      id: thread.eval_task_chat_thread.id,
      title: thread.eval_task_chat_thread.title,
      userId: thread.eval_task_chat_thread.userId,
      createdAt: thread.eval_task_chat_thread.createdAt,
      userPreferences: thread.user?.preferences ?? undefined,
      messages,
    };
  },

  selectMessagesByThreadId: async (
    threadId: string,
  ): Promise<ChatMessage[]> => {
    const result = await db
      .select()
      .from(EvalTaskChatMessageTable)
      .where(eq(EvalTaskChatMessageTable.threadId, threadId))
      .orderBy(EvalTaskChatMessageTable.createdAt);
    return result as ChatMessage[];
  },

  selectThreadsByUserId: async (
    userId: string,
  ): Promise<
    (ChatThread & {
      lastMessageAt: number;
    })[]
  > => {
    const threadWithLatestMessage = await db
      .select({
        threadId: EvalTaskChatThreadTable.id,
        title: EvalTaskChatThreadTable.title,
        createdAt: EvalTaskChatThreadTable.createdAt,
        userId: EvalTaskChatThreadTable.userId,
        lastMessageAt:
          sql<string>`MAX(${EvalTaskChatMessageTable.createdAt})`.as(
            "last_message_at",
          ),
      })
      .from(EvalTaskChatThreadTable)
      .leftJoin(
        EvalTaskChatMessageTable,
        eq(EvalTaskChatThreadTable.id, EvalTaskChatMessageTable.threadId),
      )
      .where(eq(EvalTaskChatThreadTable.userId, userId))
      .groupBy(EvalTaskChatThreadTable.id)
      .orderBy(desc(sql`last_message_at`));

    return threadWithLatestMessage.map((row) => {
      return {
        id: row.threadId,
        title: row.title,
        userId: row.userId,
        createdAt: row.createdAt,
        lastMessageAt: row.lastMessageAt
          ? new Date(row.lastMessageAt).getTime()
          : 0,
      };
    });
  },

  updateThread: async (
    id: string,
    thread: Partial<Omit<ChatThread, "id" | "createdAt">>,
  ): Promise<ChatThread> => {
    const [result] = await db
      .update(EvalTaskChatThreadTable)
      .set({
        title: thread.title,
      })
      .where(eq(EvalTaskChatThreadTable.id, id))
      .returning();
    return result;
  },
  upsertThread: async (
    thread: Omit<ChatThread, "createdAt">,
  ): Promise<ChatThread> => {
    const [result] = await db
      .insert(EvalTaskChatThreadTable)
      .values(thread)
      .onConflictDoUpdate({
        target: [EvalTaskChatThreadTable.id],
        set: {
          title: thread.title,
        },
      })
      .returning();
    return result;
  },

  deleteThread: async (id: string): Promise<void> => {
    // 1. Delete all messages in the thread
    await db
      .delete(EvalTaskChatMessageTable)
      .where(eq(EvalTaskChatMessageTable.threadId, id));

    // 2. Remove thread from all archives
    await db.delete(ArchiveItemTable).where(eq(ArchiveItemTable.itemId, id));

    // 3. Delete the thread itself
    await db
      .delete(EvalTaskChatThreadTable)
      .where(eq(EvalTaskChatThreadTable.id, id));
  },

  insertMessage: async (
    message: Omit<ChatMessage, "createdAt">,
  ): Promise<ChatMessage> => {
    const entity = {
      ...message,
      id: message.id,
    };
    const [result] = await db
      .insert(EvalTaskChatMessageTable)
      .values(entity)
      .returning();
    return result as ChatMessage;
  },

  upsertMessage: async (
    message: Omit<ChatMessage, "createdAt">,
  ): Promise<ChatMessage> => {
    const result = await db
      .insert(EvalTaskChatMessageTable)
      .values(message)
      .onConflictDoUpdate({
        target: [EvalTaskChatMessageTable.id],
        set: {
          parts: message.parts,
          metadata: message.metadata,
        },
      })
      .returning();
    return result[0] as ChatMessage;
  },

  deleteMessagesByChatIdAfterTimestamp: async (
    messageId: string,
  ): Promise<void> => {
    const [message] = await db
      .select()
      .from(EvalTaskChatMessageTable)
      .where(eq(EvalTaskChatMessageTable.id, messageId));
    if (!message) {
      return;
    }
    // Delete messages that are in the same thread AND created before or at the same time as the target message
    await db
      .delete(EvalTaskChatMessageTable)
      .where(
        and(
          eq(EvalTaskChatMessageTable.threadId, message.threadId),
          gte(EvalTaskChatMessageTable.createdAt, message.createdAt),
        ),
      );
  },

  deleteAllThreads: async (userId: string): Promise<void> => {
    const threadIds = await db
      .select({ id: EvalTaskChatThreadTable.id })
      .from(EvalTaskChatThreadTable)
      .where(eq(EvalTaskChatThreadTable.userId, userId));
    await Promise.all(
      threadIds.map((threadId) =>
        pgEvalTaskChatRepository.deleteThread(threadId.id),
      ),
    );
  },

  deleteUnarchivedThreads: async (userId: string): Promise<void> => {
    const unarchivedThreadIds = await db
      .select({ id: EvalTaskChatThreadTable.id })
      .from(EvalTaskChatThreadTable)
      .leftJoin(
        ArchiveItemTable,
        eq(EvalTaskChatThreadTable.id, ArchiveItemTable.itemId),
      )
      .where(
        and(
          eq(EvalTaskChatThreadTable.userId, userId),
          sql`${ArchiveItemTable.id} IS NULL`,
        ),
      );

    await Promise.all(
      unarchivedThreadIds.map((threadId) =>
        pgEvalTaskChatRepository.deleteThread(threadId.id),
      ),
    );
  },

  insertMessages: async (
    messages: PartialBy<ChatMessage, "createdAt">[],
  ): Promise<ChatMessage[]> => {
    const result = await db
      .insert(EvalTaskChatMessageTable)
      .values(messages)
      .returning();
    return result as ChatMessage[];
  },

  checkAccess: async (id: string, userId: string): Promise<boolean> => {
    const [result] = await db
      .select({
        userId: EvalTaskChatThreadTable.userId,
      })
      .from(EvalTaskChatThreadTable)
      .where(
        and(
          eq(EvalTaskChatThreadTable.id, id),
          eq(EvalTaskChatThreadTable.userId, userId),
        ),
      );
    return Boolean(result);
  },
};

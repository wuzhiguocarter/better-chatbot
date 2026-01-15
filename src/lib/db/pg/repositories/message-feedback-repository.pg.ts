import { and, eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { MessageFeedbackTable } from "../schema.pg";

export type FeedbackType = "upvote" | "downvote";

export interface MessageFeedbackRepository {
  createFeedback(
    userId: string,
    messageId: string,
    feedbackType: FeedbackType,
  ): Promise<void>;

  removeFeedback(userId: string, messageId: string): Promise<void>;

  toggleFeedback(
    userId: string,
    messageId: string,
    feedbackType: FeedbackType,
  ): Promise<FeedbackType | null>;

  getFeedback(userId: string, messageId: string): Promise<FeedbackType | null>;

  getMessageFeedbackStats(messageId: string): Promise<{
    upvotes: number;
    downvotes: number;
  }>;
}

export const pgMessageFeedbackRepository: MessageFeedbackRepository = {
  async createFeedback(userId, messageId, feedbackType) {
    await db.insert(MessageFeedbackTable).values({
      userId,
      messageId,
      feedbackType,
    });
  },

  async removeFeedback(userId, messageId) {
    await db
      .delete(MessageFeedbackTable)
      .where(
        and(
          eq(MessageFeedbackTable.userId, userId),
          eq(MessageFeedbackTable.messageId, messageId),
        ),
      );
  },

  async toggleFeedback(userId, messageId, feedbackType) {
    // Check if feedback exists
    const [existing] = await db
      .select()
      .from(MessageFeedbackTable)
      .where(
        and(
          eq(MessageFeedbackTable.userId, userId),
          eq(MessageFeedbackTable.messageId, messageId),
        ),
      )
      .limit(1);

    if (existing) {
      // If same feedback type, remove it
      if (existing.feedbackType === feedbackType) {
        await this.removeFeedback(userId, messageId);
        return null;
      }
      // If different feedback type, update it
      await db
        .update(MessageFeedbackTable)
        .set({ feedbackType })
        .where(
          and(
            eq(MessageFeedbackTable.userId, userId),
            eq(MessageFeedbackTable.messageId, messageId),
          ),
        );
      return feedbackType;
    }

    // No existing feedback, create new
    await this.createFeedback(userId, messageId, feedbackType);
    return feedbackType;
  },

  async getFeedback(userId, messageId) {
    const [feedback] = await db
      .select()
      .from(MessageFeedbackTable)
      .where(
        and(
          eq(MessageFeedbackTable.userId, userId),
          eq(MessageFeedbackTable.messageId, messageId),
        ),
      )
      .limit(1);

    return feedback?.feedbackType ?? null;
  },

  async getMessageFeedbackStats(messageId) {
    const feedbacks = await db
      .select()
      .from(MessageFeedbackTable)
      .where(eq(MessageFeedbackTable.messageId, messageId));

    return {
      upvotes: feedbacks.filter((f) => f.feedbackType === "upvote").length,
      downvotes: feedbacks.filter((f) => f.feedbackType === "downvote").length,
    };
  },
};

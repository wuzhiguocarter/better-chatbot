import { getSession } from "auth/server";
import { messageFeedbackRepository } from "lib/db/repository";
import { z } from "zod";

const FeedbackSchema = z.object({
  messageId: z.string().min(1),
  feedbackType: z.enum(["upvote", "downvote"]),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messageId, feedbackType } = FeedbackSchema.parse(body);

    const result = await messageFeedbackRepository.toggleFeedback(
      session.user.id,
      messageId,
      feedbackType,
    );

    return Response.json({ success: true, feedbackType: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Error toggling feedback:", error);
    return Response.json(
      { error: "Failed to toggle feedback" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return Response.json({ error: "messageId is required" }, { status: 400 });
    }

    const feedbackType = await messageFeedbackRepository.getFeedback(
      session.user.id,
      messageId,
    );

    return Response.json({ feedbackType });
  } catch (error) {
    console.error("Error getting feedback:", error);
    return Response.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}

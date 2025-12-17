import { notFound, redirect } from "next/navigation";
import { getSession } from "auth/server";
import { EvalTaskChatBot } from "@/components/eval-task-chat-bot";
import { selectEvalTaskChatThreadWithMessagesAction } from "@/app/api/eval/task_chat/actions";

interface PageProps {
  params: Promise<{ thread: string }>;
}

export default async function EvalTaskChatPage({ params }: PageProps) {
  const { thread: threadId } = await params;

  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const thread = await selectEvalTaskChatThreadWithMessagesAction(threadId);

  if (!thread) {
    notFound();
  }

  return (
    <div className="flex h-full w-full flex-col">
      <EvalTaskChatBot
        threadId={thread.id}
        initialMessages={thread.messages ?? []}
      />
    </div>
  );
}

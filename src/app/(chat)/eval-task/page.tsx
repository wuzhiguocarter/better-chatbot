import { redirect } from "next/navigation";
import { getSession } from "auth/server";
import { generateUUID } from "lib/utils";
import { EvalTaskChatBot } from "@/components/eval-task-chat-bot";

export const dynamic = "force-dynamic";

export default async function EvalTaskPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  const threadId = generateUUID();

  return (
    <div className="flex h-full w-full flex-col">
      <EvalTaskChatBot
        key={threadId}
        threadId={threadId}
        initialMessages={[]}
      />
    </div>
  );
}

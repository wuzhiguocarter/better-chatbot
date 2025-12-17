import { EvalTaskChatBot } from "@/components/eval-task-chat-bot";
import { generateUUID } from "lib/utils";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EvalTaskPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const id = generateUUID();

  return (
    <div className="flex h-full w-full flex-col">
      <EvalTaskChatBot initialMessages={[]} threadId={id} key={id} />
    </div>
  );
}

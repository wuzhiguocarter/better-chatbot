"use server";

import { getSession } from "auth/server";
import { evalTaskChatRepository } from "lib/db/repository";

export async function selectEvalTaskChatThreadWithMessagesAction(id: string) {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const thread = await evalTaskChatRepository.selectThreadDetails(id);

  if (!thread || thread.userId !== session.user.id) {
    return null;
  }

  return {
    ...thread,
    messages: thread.messages ?? [],
  };
}

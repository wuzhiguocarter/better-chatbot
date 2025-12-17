import { getSession } from "auth/server";
import { evalTaskChatRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const threads = await evalTaskChatRepository.selectThreadsByUserId(
    session.user.id,
  );

  return Response.json(threads);
}

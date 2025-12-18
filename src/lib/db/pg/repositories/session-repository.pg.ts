import { desc, eq } from "drizzle-orm";

import { SessionTable } from "../schema.pg";
import { pgDb } from "../db.pg";

export const pgSessionRepository = {
  async getLatestSessionTokenByUserId(userId: string): Promise<string | null> {
    const [session] = await pgDb
      .select({ token: SessionTable.token })
      .from(SessionTable)
      .where(eq(SessionTable.userId, userId))
      .orderBy(desc(SessionTable.updatedAt))
      .limit(1);

    return session?.token ?? null;
  },
};

export type PgSessionRepository = typeof pgSessionRepository;

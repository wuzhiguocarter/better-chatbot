import {
  EvalFileCreateInput,
  EvalFileEntity,
  EvalFileListQuery,
  EvalFileRepository,
} from "app-types/eval";
import { pgDb as db } from "../db.pg";
import { EvalFileTable } from "../schema.pg";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

export const pgEvalFileRepository: EvalFileRepository = {
  async listEvalFilesByUserId({
    userId,
    page,
    limit,
    search,
  }: EvalFileListQuery) {
    const conditions = [eq(EvalFileTable.userId, userId)];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(EvalFileTable.title, term),
          ilike(EvalFileTable.description, term),
        ),
      );
    }

    const whereClause =
      conditions.length === 1 ? conditions[0] : and(...conditions);
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(EvalFileTable)
      .where(whereClause)
      .orderBy(desc(EvalFileTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(EvalFileTable)
      .where(whereClause);

    return {
      rows: rows as EvalFileEntity[],
      total: Number(totalResult?.count ?? 0),
    };
  },

  async createEvalFile(input: EvalFileCreateInput) {
    const [row] = await db
      .insert(EvalFileTable)
      .values({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return row as EvalFileEntity;
  },
};

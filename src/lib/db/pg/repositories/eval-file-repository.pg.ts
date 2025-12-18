import {
  EvalFileCreateInput,
  EvalFileEntity,
  EvalFileListQuery,
  EvalFileRepository,
  EvalFileStatus,
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
    const conditions = [
      eq(EvalFileTable.userId, userId),
      eq(EvalFileTable.isDeleted, false),
    ];

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

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(EvalFileTable)
      .where(and(eq(EvalFileTable.id, id), eq(EvalFileTable.isDeleted, false)))
      .limit(1);

    return (row ?? null) as EvalFileEntity | null;
  },

  async softDeleteEvalFile({ id, userId }) {
    const [row] = await db
      .update(EvalFileTable)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
        status: "deleted",
      })
      .where(
        and(
          eq(EvalFileTable.id, id),
          eq(EvalFileTable.userId, userId),
          eq(EvalFileTable.isDeleted, false),
        ),
      )
      .returning();

    return (row ?? null) as EvalFileEntity | null;
  },

  async updateStatus({ id, status }: { id: string; status: EvalFileStatus }) {
    await db
      .update(EvalFileTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(EvalFileTable.id, id));
  },
};

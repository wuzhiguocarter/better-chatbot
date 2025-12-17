import {
  EvaluationConfigurationCreateInput,
  EvaluationConfigurationEntity,
} from "app-types/eval/index";
import { eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { EvalConfigurationTable } from "../schema.pg";

async function getByFileId(
  fileId: string,
): Promise<EvaluationConfigurationEntity | null> {
  const [row] = await db
    .select()
    .from(EvalConfigurationTable)
    .where(eq(EvalConfigurationTable.fileId, fileId))
    .limit(1);

  return (row ?? null) as EvaluationConfigurationEntity | null;
}

async function upsertByFileId(
  fileId: string,
  input: EvaluationConfigurationCreateInput,
): Promise<EvaluationConfigurationEntity> {
  const existing = await getByFileId(fileId);
  const now = new Date();

  if (existing) {
    const [row] = await db
      .update(EvalConfigurationTable)
      .set({ ...input, updatedAt: now })
      .where(eq(EvalConfigurationTable.id, existing.id))
      .returning();

    return row as EvaluationConfigurationEntity;
  }

  const [row] = await db
    .insert(EvalConfigurationTable)
    .values({
      ...input,
      fileId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row as EvaluationConfigurationEntity;
}

async function deleteByFileId(fileId: string): Promise<void> {
  await db
    .delete(EvalConfigurationTable)
    .where(eq(EvalConfigurationTable.fileId, fileId));
}

export const pgEvalConfigurationRepository = {
  getByFileId,
  upsertByFileId,
  deleteByFileId,
};

export default pgEvalConfigurationRepository;

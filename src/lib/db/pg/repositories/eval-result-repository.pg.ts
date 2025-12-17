import {
  EvaluationResultItemCreateInput,
  EvaluationResultItemEntity,
} from "app-types/eval/index";
import { asc, eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { EvalResultItemTable } from "../schema.pg";

async function insertMany(
  fileId: string,
  rows: EvaluationResultItemCreateInput[],
): Promise<void> {
  if (!rows.length) return;

  const now = new Date();
  const payload = rows.map((row) => ({
    ...row,
    fileId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(EvalResultItemTable).values(payload);
}

async function listByFileId(
  fileId: string,
): Promise<EvaluationResultItemEntity[]> {
  const results = await db
    .select()
    .from(EvalResultItemTable)
    .where(eq(EvalResultItemTable.fileId, fileId))
    .orderBy(asc(EvalResultItemTable.rowIndex));

  return results as EvaluationResultItemEntity[];
}

export const pgEvalResultRepository = {
  insertMany,
  listByFileId,
};

export default pgEvalResultRepository;

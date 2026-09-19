import "server-only";
import { prisma } from "@/lib/prisma";

export async function logHistory(params: {
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  changedById: string;
}) {
  await prisma.historyLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      beforeData: params.before !== undefined ? JSON.stringify(params.before) : null,
      afterData: params.after !== undefined ? JSON.stringify(params.after) : null,
      changedById: params.changedById,
    },
  });
}

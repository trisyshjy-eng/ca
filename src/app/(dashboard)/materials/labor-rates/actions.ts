"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { logHistory } from "@/lib/history";

const LaborRateSchema = z.object({
  processName: z.string().min(1, "공정명을 입력해 주세요."),
  hourlyWage: z.coerce.number().positive("시간당 임금은 0보다 커야 합니다."),
});

export interface LaborRateFormState {
  error?: string;
}

function parseForm(formData: FormData) {
  return LaborRateSchema.safeParse({
    processName: formData.get("processName"),
    hourlyWage: formData.get("hourlyWage"),
  });
}

export async function createLaborRate(
  _prevState: LaborRateFormState | undefined,
  formData: FormData
): Promise<LaborRateFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.laborRate.create({ data: parsed.data });
  after(() =>
    logHistory({ entityType: "LaborRate", entityId: created.id, after: created, changedById: session.userId })
  );

  revalidatePath("/materials/labor-rates");
  redirect("/materials/labor-rates");
}

export async function updateLaborRate(
  id: string,
  _prevState: LaborRateFormState | undefined,
  formData: FormData
): Promise<LaborRateFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const before = await prisma.laborRate.findUnique({ where: { id } });
  const updated = await prisma.laborRate.update({ where: { id }, data: parsed.data });
  after(() =>
    logHistory({ entityType: "LaborRate", entityId: id, before, after: updated, changedById: session.userId })
  );

  revalidatePath("/materials/labor-rates");
  redirect("/materials/labor-rates");
}

export async function deleteLaborRate(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const before = await prisma.laborRate.findUnique({ where: { id } });
  await prisma.laborRate.update({ where: { id }, data: { isActive: false } });
  after(() =>
    logHistory({
      entityType: "LaborRate",
      entityId: id,
      before,
      after: { ...before, isActive: false },
      changedById: session.userId,
    })
  );

  revalidatePath("/materials/labor-rates");
}

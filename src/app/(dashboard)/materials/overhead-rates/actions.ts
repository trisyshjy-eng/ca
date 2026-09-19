"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { logHistory } from "@/lib/history";

const OverheadRateSchema = z.object({
  category: z.enum(["MANUFACTURING", "OUTSOURCING"]),
  base: z.enum(["MATERIAL_COST", "LABOR_COST"]),
  name: z.string().min(1, "항목명을 입력해 주세요."),
  rate: z.coerce.number().gt(0, "배부율은 0보다 커야 합니다."),
});

export interface OverheadRateFormState {
  error?: string;
}

function parseForm(formData: FormData) {
  return OverheadRateSchema.safeParse({
    category: formData.get("category"),
    base: formData.get("base"),
    name: formData.get("name"),
    rate: formData.get("rate"),
  });
}

export async function createOverheadRate(
  _prevState: OverheadRateFormState | undefined,
  formData: FormData
): Promise<OverheadRateFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.overheadRate.create({ data: parsed.data });
  await logHistory({
    entityType: "OverheadRate",
    entityId: created.id,
    after: created,
    changedById: session.userId,
  });

  revalidatePath("/materials/overhead-rates");
  redirect("/materials/overhead-rates");
}

export async function updateOverheadRate(
  id: string,
  _prevState: OverheadRateFormState | undefined,
  formData: FormData
): Promise<OverheadRateFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const before = await prisma.overheadRate.findUnique({ where: { id } });
  const updated = await prisma.overheadRate.update({ where: { id }, data: parsed.data });
  await logHistory({
    entityType: "OverheadRate",
    entityId: id,
    before,
    after: updated,
    changedById: session.userId,
  });

  revalidatePath("/materials/overhead-rates");
  redirect("/materials/overhead-rates");
}

export async function deleteOverheadRate(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const before = await prisma.overheadRate.findUnique({ where: { id } });
  await prisma.overheadRate.update({ where: { id }, data: { isActive: false } });
  await logHistory({
    entityType: "OverheadRate",
    entityId: id,
    before,
    after: { ...before, isActive: false },
    changedById: session.userId,
  });

  revalidatePath("/materials/overhead-rates");
}

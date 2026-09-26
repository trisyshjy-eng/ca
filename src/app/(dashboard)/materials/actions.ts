"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { logHistory } from "@/lib/history";

const RawMaterialSchema = z.object({
  name: z.string().min(1, "자재명을 입력해 주세요."),
  origin: z.string().optional(),
  vendor: z.string().optional(),
  unitCost: z.coerce.number().positive("원물원가는 0보다 커야 합니다."),
  purchaseWeight: z.coerce.number().positive("구매중량은 0보다 커야 합니다."),
  yieldRate: z.coerce.number().gt(0, "수율은 0보다 커야 합니다.").lte(1, "수율은 1 이하여야 합니다."),
});

export interface RawMaterialFormState {
  error?: string;
}

function parseRawMaterialForm(formData: FormData) {
  return RawMaterialSchema.safeParse({
    name: formData.get("name"),
    origin: formData.get("origin") || undefined,
    vendor: formData.get("vendor") || undefined,
    unitCost: formData.get("unitCost"),
    purchaseWeight: formData.get("purchaseWeight"),
    yieldRate: formData.get("yieldRate"),
  });
}

export async function createRawMaterial(
  _prevState: RawMaterialFormState | undefined,
  formData: FormData
): Promise<RawMaterialFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = parseRawMaterialForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const created = await prisma.rawMaterial.create({ data: parsed.data });
  after(() =>
    logHistory({
      entityType: "RawMaterial",
      entityId: created.id,
      after: created,
      changedById: session.userId,
    })
  );

  revalidatePath("/materials");
  redirect("/materials");
}

export async function updateRawMaterial(
  id: string,
  _prevState: RawMaterialFormState | undefined,
  formData: FormData
): Promise<RawMaterialFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = parseRawMaterialForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const before = await prisma.rawMaterial.findUnique({ where: { id } });
  const updated = await prisma.rawMaterial.update({ where: { id }, data: parsed.data });

  after(() =>
    logHistory({
      entityType: "RawMaterial",
      entityId: id,
      before,
      after: updated,
      changedById: session.userId,
    })
  );

  revalidatePath("/materials");
  redirect("/materials");
}

export async function deleteRawMaterial(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const before = await prisma.rawMaterial.findUnique({ where: { id } });
  await prisma.rawMaterial.update({ where: { id }, data: { isActive: false } });

  after(() =>
    logHistory({
      entityType: "RawMaterial",
      entityId: id,
      before,
      after: { ...before, isActive: false },
      changedById: session.userId,
    })
  );

  revalidatePath("/materials");
}

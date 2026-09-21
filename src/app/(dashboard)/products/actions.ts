"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { logHistory } from "@/lib/history";

const ProductSchema = z.object({
  name: z.string().min(1, "제품명을 입력해 주세요."),
  targetWeight: z.coerce.number().positive("목표 패키지 중량은 0보다 커야 합니다."),
});

export interface ProductFormState {
  error?: string;
}

export async function createProduct(
  _prevState: ProductFormState | undefined,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    targetWeight: formData.get("targetWeight"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.product.create({ data: parsed.data });
  after(() =>
    logHistory({ entityType: "Product", entityId: created.id, after: created, changedById: session.userId })
  );

  revalidatePath("/products");
  redirect(`/products/${created.id}`);
}

export async function updateProduct(
  id: string,
  _prevState: ProductFormState | undefined,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    targetWeight: formData.get("targetWeight"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const before = await prisma.product.findUnique({ where: { id } });
  const updated = await prisma.product.update({ where: { id }, data: parsed.data });
  after(() =>
    logHistory({ entityType: "Product", entityId: id, before, after: updated, changedById: session.userId })
  );

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}

export async function archiveProduct(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const before = await prisma.product.findUnique({ where: { id } });
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  after(() =>
    logHistory({
      entityType: "Product",
      entityId: id,
      before,
      after: { ...before, isActive: false },
      changedById: session.userId,
    })
  );

  revalidatePath("/products");
}

// --- BOM ---
const BomSchema = z.object({
  productId: z.string().min(1),
  rawMaterialId: z.string().min(1, "구성품목을 선택해 주세요."),
  groupCode: z.string().min(1, "제품형태를 입력해 주세요."),
  mixRatio: z.coerce.number().gt(0, "배합비는 0보다 커야 합니다.").lte(1, "배합비는 1 이하여야 합니다."),
  blendRatio: z.coerce.number().gt(0, "혼합비율은 0보다 커야 합니다.").lte(1, "혼합비율은 1 이하여야 합니다."),
});

export interface BomFormState {
  error?: string;
}

export async function addBomLine(
  _prevState: BomFormState | undefined,
  formData: FormData
): Promise<BomFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = BomSchema.safeParse({
    productId: formData.get("productId"),
    rawMaterialId: formData.get("rawMaterialId"),
    groupCode: formData.get("groupCode"),
    mixRatio: formData.get("mixRatio"),
    blendRatio: formData.get("blendRatio") || 1,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.productBOM.create({ data: parsed.data });
  after(() =>
    logHistory({ entityType: "ProductBOM", entityId: created.id, after: created, changedById: session.userId })
  );

  revalidatePath(`/products/${parsed.data.productId}`);
  return {};
}

export async function deleteBomLine(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  const productId = formData.get("productId");
  if (typeof id !== "string" || typeof productId !== "string") return;

  const before = await prisma.productBOM.findUnique({ where: { id } });
  await prisma.productBOM.delete({ where: { id } });
  after(() => logHistory({ entityType: "ProductBOM", entityId: id, before, changedById: session.userId }));

  revalidatePath(`/products/${productId}`);
}

// --- Packaging ---
const PackagingSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1, "포장재명을 입력해 주세요."),
  unitPrice: z.coerce.number().positive("단가는 0보다 커야 합니다."),
  quantity: z.coerce.number().positive("수량은 0보다 커야 합니다."),
});

export interface PackagingFormState {
  error?: string;
}

export async function addPackagingLine(
  _prevState: PackagingFormState | undefined,
  formData: FormData
): Promise<PackagingFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = PackagingSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    unitPrice: formData.get("unitPrice"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.packagingCost.create({ data: parsed.data });
  after(() =>
    logHistory({ entityType: "PackagingCost", entityId: created.id, after: created, changedById: session.userId })
  );

  revalidatePath(`/products/${parsed.data.productId}`);
  return {};
}

export async function deletePackagingLine(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  const productId = formData.get("productId");
  if (typeof id !== "string" || typeof productId !== "string") return;

  const before = await prisma.packagingCost.findUnique({ where: { id } });
  await prisma.packagingCost.delete({ where: { id } });
  after(() => logHistory({ entityType: "PackagingCost", entityId: id, before, changedById: session.userId }));

  revalidatePath(`/products/${productId}`);
}

// --- Process ---
const ProcessSchema = z.object({
  productId: z.string().min(1),
  laborRateId: z.string().min(1, "공정을 선택해 주세요."),
  workHours: z.coerce.number().positive("작업시간은 0보다 커야 합니다."),
});

export interface ProcessFormState {
  error?: string;
}

export async function addProcessLine(
  _prevState: ProcessFormState | undefined,
  formData: FormData
): Promise<ProcessFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = ProcessSchema.safeParse({
    productId: formData.get("productId"),
    laborRateId: formData.get("laborRateId"),
    workHours: formData.get("workHours"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.productProcess.create({ data: parsed.data });
  after(() =>
    logHistory({ entityType: "ProductProcess", entityId: created.id, after: created, changedById: session.userId })
  );

  revalidatePath(`/products/${parsed.data.productId}`);
  return {};
}

export async function deleteProcessLine(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  const productId = formData.get("productId");
  if (typeof id !== "string" || typeof productId !== "string") return;

  const before = await prisma.productProcess.findUnique({ where: { id } });
  await prisma.productProcess.delete({ where: { id } });
  after(() => logHistory({ entityType: "ProductProcess", entityId: id, before, changedById: session.userId }));

  revalidatePath(`/products/${productId}`);
}

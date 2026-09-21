"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { logHistory } from "@/lib/history";
import { calcCost, calcPriceProposal } from "@/lib/costEngine";

const ProposalRequestSchema = z.object({
  companyName: z.string().min(1, "업체명을 입력해 주세요."),
  contactPerson: z.string().min(1, "담당자를 입력해 주세요."),
  productId: z.string().min(1, "품목을 선택해 주세요."),
  requestDate: z.string().min(1, "요청일을 입력해 주세요."),
  requestedQty: z.coerce.number().positive("요청수량은 0보다 커야 합니다."),
});

export interface ProposalFormState {
  error?: string;
}

export async function createProposalRequest(
  _prevState: ProposalFormState | undefined,
  formData: FormData
): Promise<ProposalFormState> {
  const session = await requireRole("ADMIN", "STAFF");
  const parsed = ProposalRequestSchema.safeParse({
    companyName: formData.get("companyName"),
    contactPerson: formData.get("contactPerson"),
    productId: formData.get("productId"),
    requestDate: formData.get("requestDate"),
    requestedQty: formData.get("requestedQty"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const created = await prisma.proposalRequest.create({
    data: {
      companyName: parsed.data.companyName,
      contactPerson: parsed.data.contactPerson,
      productId: parsed.data.productId,
      requestDate: new Date(parsed.data.requestDate),
      requestedQty: parsed.data.requestedQty,
      requestedById: session.userId,
    },
  });

  after(() =>
    logHistory({
      entityType: "ProposalRequest",
      entityId: created.id,
      after: created,
      changedById: session.userId,
    })
  );

  revalidatePath("/proposals");
  redirect(`/proposals/${created.id}`);
}

export async function deleteProposalRequest(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const before = await prisma.proposalRequest.findUnique({ where: { id } });
  await prisma.proposalRequest.delete({ where: { id } });
  after(() => logHistory({ entityType: "ProposalRequest", entityId: id, before, changedById: session.userId }));

  revalidatePath("/proposals");
}

// --- Cost calculation ---
const CalculationSchema = z.object({
  proposalRequestId: z.string().min(1),
  overheadRateIds: z.array(z.string()).default([]),
  outsourcingCost: z.coerce.number().min(0).default(0),
});

export interface CalculationFormState {
  error?: string;
}

export async function runCostCalculation(
  _prevState: CalculationFormState | undefined,
  formData: FormData
): Promise<CalculationFormState> {
  const session = await requireRole("ADMIN", "STAFF");

  const parsed = CalculationSchema.safeParse({
    proposalRequestId: formData.get("proposalRequestId"),
    overheadRateIds: formData.getAll("overheadRateIds"),
    outsourcingCost: formData.get("outsourcingCost") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const proposal = await prisma.proposalRequest.findUnique({
    where: { id: parsed.data.proposalRequestId },
    include: {
      product: {
        include: {
          bom: { include: { rawMaterial: true } },
          packagingCosts: true,
          processes: { include: { laborRate: true } },
        },
      },
    },
  });
  if (!proposal) return { error: "제안요청을 찾을 수 없습니다." };

  const overheadRates = parsed.data.overheadRateIds.length
    ? await prisma.overheadRate.findMany({ where: { id: { in: parsed.data.overheadRateIds } } })
    : [];

  const result = calcCost({
    targetWeight: proposal.product.targetWeight,
    bomLines: proposal.product.bom.map((b) => ({
      groupCode: b.groupCode,
      mixRatio: b.mixRatio,
      blendRatio: b.blendRatio,
      rawMaterial: b.rawMaterial,
    })),
    laborLines: proposal.product.processes.map((p) => ({
      workHours: p.workHours,
      hourlyWage: p.laborRate.hourlyWage,
    })),
    overheadLines: overheadRates.map((o) => ({ base: o.base, rate: o.rate })),
    packagingLines: proposal.product.packagingCosts,
    outsourcingCost: parsed.data.outsourcingCost,
  });

  const calculation = await prisma.costCalculation.create({
    data: {
      proposalRequestId: proposal.id,
      materialCost: result.materialCost,
      laborCost: result.laborCost,
      overheadCost: result.overheadCost,
      packagingCost: result.packagingCost,
      manufacturingCost: result.manufacturingCost,
      outsourcingCost: result.outsourcingCost,
      totalCost: result.totalCost,
      calculatedById: session.userId,
    },
  });

  await prisma.proposalRequest.update({ where: { id: proposal.id }, data: { status: "CALCULATING" } });

  after(() =>
    logHistory({
      entityType: "CostCalculation",
      entityId: calculation.id,
      after: calculation,
      changedById: session.userId,
    })
  );

  revalidatePath(`/proposals/${proposal.id}`);
  return {};
}

// --- Price proposal ---
const PriceProposalSchema = z.object({
  costCalculationId: z.string().min(1),
  proposalRequestId: z.string().min(1),
  distributorMarginRate: z.coerce.number().min(0, "제안업체 마진률은 0 이상이어야 합니다.").default(0),
  marginType: z.enum(["RATE", "AMOUNT"]),
  marginValue: z.coerce.number(),
  retailPrice: z.coerce.number().optional(),
});

export interface PriceProposalFormState {
  error?: string;
}

export async function createPriceProposal(
  _prevState: PriceProposalFormState | undefined,
  formData: FormData
): Promise<PriceProposalFormState> {
  const session = await requireRole("ADMIN", "STAFF");

  const retailPriceRaw = formData.get("retailPrice");
  const parsed = PriceProposalSchema.safeParse({
    costCalculationId: formData.get("costCalculationId"),
    proposalRequestId: formData.get("proposalRequestId"),
    distributorMarginRate: formData.get("distributorMarginRate") ?? 0,
    marginType: formData.get("marginType"),
    marginValue: formData.get("marginValue"),
    retailPrice: retailPriceRaw ? retailPriceRaw : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const calculation = await prisma.costCalculation.findUnique({ where: { id: parsed.data.costCalculationId } });
  if (!calculation) return { error: "원가계산 결과를 찾을 수 없습니다." };

  const result = calcPriceProposal({
    totalCost: calculation.totalCost,
    distributorMarginRate: parsed.data.distributorMarginRate,
    marginType: parsed.data.marginType,
    marginValue: parsed.data.marginValue,
    retailPrice: parsed.data.retailPrice,
  });

  const priceProposal = await prisma.priceProposal.create({
    data: {
      costCalculationId: calculation.id,
      distributorMarginRate: parsed.data.distributorMarginRate,
      marginType: parsed.data.marginType,
      marginValue: parsed.data.marginValue,
      priceBeforeTax: result.priceBeforeTax,
      priceAfterTax: result.priceAfterTax,
      retailPrice: parsed.data.retailPrice,
      priceDifference: result.priceDifference ?? undefined,
      priceDifferenceRate: result.priceDifferenceRate ?? undefined,
    },
  });

  await prisma.proposalRequest.update({ where: { id: parsed.data.proposalRequestId }, data: { status: "PRICED" } });

  after(() =>
    logHistory({
      entityType: "PriceProposal",
      entityId: priceProposal.id,
      after: priceProposal,
      changedById: session.userId,
    })
  );

  revalidatePath(`/proposals/${parsed.data.proposalRequestId}`);
  return {};
}

export async function decidePriceProposal(formData: FormData) {
  const session = await requireRole("ADMIN");
  const priceProposalId = formData.get("priceProposalId");
  const proposalRequestId = formData.get("proposalRequestId");
  const decision = formData.get("decision");
  if (typeof priceProposalId !== "string" || typeof proposalRequestId !== "string") return;
  if (decision !== "APPROVED" && decision !== "REJECTED") return;

  const before = await prisma.priceProposal.findUnique({ where: { id: priceProposalId } });
  const updated = await prisma.priceProposal.update({
    where: { id: priceProposalId },
    data: {
      approvalStatus: decision,
      approvedById: session.userId,
      approvedAt: new Date(),
    },
  });

  await prisma.proposalRequest.update({
    where: { id: proposalRequestId },
    data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED" },
  });

  after(() =>
    logHistory({
      entityType: "PriceProposal",
      entityId: priceProposalId,
      before,
      after: updated,
      changedById: session.userId,
    })
  );

  revalidatePath(`/proposals/${proposalRequestId}`);
}

export async function markProposalSent(formData: FormData) {
  const session = await requireRole("ADMIN", "STAFF");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const before = await prisma.proposalRequest.findUnique({ where: { id } });
  const updated = await prisma.proposalRequest.update({ where: { id }, data: { status: "SENT" } });

  after(() =>
    logHistory({
      entityType: "ProposalRequest",
      entityId: id,
      before,
      after: updated,
      changedById: session.userId,
    })
  );

  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
}

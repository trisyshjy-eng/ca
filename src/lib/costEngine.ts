export interface RawMaterialInput {
  unitCost: number; // 원물원가 (구매 단가, 원)
  purchaseWeight: number; // 구매중량(g)
  yieldRate: number; // 수율/보존율 (0~1)
}

export interface BomLineInput {
  groupCode: string; // 배합비 슬롯 구분 (예: 소스/주꾸미/표고)
  mixRatio: number; // 배합비 (슬롯의 품목 내 비중)
  blendRatio?: number; // 혼합비율 (슬롯 내 세부 분배 비율, 기본 1)
  rawMaterial: RawMaterialInput;
}

export interface LaborLineInput {
  workHours: number;
  hourlyWage: number;
}

export interface OverheadLineInput {
  base: "MATERIAL_COST" | "LABOR_COST";
  rate: number; // 0~1
}

export interface PackagingLineInput {
  unitPrice: number;
  quantity: number;
}

export interface CostCalculationInput {
  targetWeight: number; // 목표 패키지(구성중량, g)
  bomLines: BomLineInput[];
  laborLines: LaborLineInput[];
  overheadLines: OverheadLineInput[];
  packagingLines: PackagingLineInput[];
  outsourcingCost?: number; // 외주가공비 (견적단가 × 수량, 없으면 0)
}

export interface BomLineResult extends BomLineInput {
  rawMaterialWeight: number; // 원물중량 = 구매중량 × 수율
  costPer100g: number; // 100g당원가
  ratioWeight: number; // 비율중량 = 구성중량 × 배합비
  actualWeight: number; // 실사용중량 = 비율중량 × 혼합비율
  lineCost: number; // 제조중량단가 = 실사용중량 × 100g당원가 ÷ 100
}

export interface CostCalculationResult {
  bomResults: BomLineResult[];
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  manufacturingCost: number;
  outsourcingCost: number;
  totalCost: number;
}

export interface MarginInput {
  totalCost: number;
  distributorMarginRate?: number; // 제안업체 마진률(0~1). 총원가 → 중간단가 산출에 사용, 기본 0
  marginType: "RATE" | "AMOUNT";
  marginValue: number; // 최종 마진율(0~1) 또는 마진액(원). 중간단가 → 제안단가(세전) 산출에 사용
  vatRate?: number; // 부가세율, 기본 0.1
  retailPrice?: number; // 결정 소매가 (선택)
}

export interface PriceProposalResult {
  distributorPrice: number; // 중간단가 = 총원가 × (1 + 제안업체마진률)
  distributorMarginAmount: number; // 제안업체 마진액(세전) = 중간단가 - 총원가
  priceBeforeTax: number; // 제안단가(세전) = 중간단가 × (1+최종마진율) 또는 중간단가+최종마진액
  finalMarginAmount: number; // 최종 마진액(세전) = 제안단가(세전) - 중간단가
  grossProfit: number; // 총 매출이익(세전) = 제안단가(세전) - 총원가 (= 제안업체마진액 + 최종마진액)
  grossProfitRate: number; // 매출이익률
  priceAfterTax: number; // 최종 제안단가(세후)
  priceDifference: number | null; // 차액
  priceDifferenceRate: number | null; // 차액비율
}

export function calcRawMaterialWeight(rm: RawMaterialInput): number {
  return rm.purchaseWeight * rm.yieldRate;
}

export function calcCostPer100g(rm: RawMaterialInput): number {
  const weight = calcRawMaterialWeight(rm);
  return (rm.unitCost / weight) * 100;
}

export function calcBomLine(targetWeight: number, line: BomLineInput): BomLineResult {
  const blendRatio = line.blendRatio ?? 1;
  const rawMaterialWeight = calcRawMaterialWeight(line.rawMaterial);
  const costPer100g = calcCostPer100g(line.rawMaterial);
  const ratioWeight = targetWeight * line.mixRatio;
  const actualWeight = ratioWeight * blendRatio;
  const lineCost = (actualWeight * costPer100g) / 100;

  return {
    ...line,
    blendRatio,
    rawMaterialWeight,
    costPer100g,
    ratioWeight,
    actualWeight,
    lineCost,
  };
}

export function calcLaborCost(lines: LaborLineInput[]): number {
  return lines.reduce((sum, l) => sum + l.workHours * l.hourlyWage, 0);
}

export function calcOverheadCost(
  lines: OverheadLineInput[],
  materialCost: number,
  laborCost: number
): number {
  return lines.reduce((sum, l) => {
    const base = l.base === "MATERIAL_COST" ? materialCost : laborCost;
    return sum + base * l.rate;
  }, 0);
}

export function calcPackagingCost(lines: PackagingLineInput[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function calcCost(input: CostCalculationInput): CostCalculationResult {
  const bomResults = input.bomLines.map((line) => calcBomLine(input.targetWeight, line));
  const materialCost = bomResults.reduce((sum, r) => sum + r.lineCost, 0);
  const laborCost = calcLaborCost(input.laborLines);
  const overheadCost = calcOverheadCost(input.overheadLines, materialCost, laborCost);
  const packagingCost = calcPackagingCost(input.packagingLines);
  const manufacturingCost = materialCost + laborCost + overheadCost + packagingCost;
  const outsourcingCost = input.outsourcingCost ?? 0;
  const totalCost = manufacturingCost + outsourcingCost;

  return {
    bomResults,
    materialCost,
    laborCost,
    overheadCost,
    packagingCost,
    manufacturingCost,
    outsourcingCost,
    totalCost,
  };
}

export function calcPriceProposal(input: MarginInput): PriceProposalResult {
  const vatRate = input.vatRate ?? 0.1;
  const distributorMarginRate = input.distributorMarginRate ?? 0;

  // 1단계: 총원가 → 중간단가 (제안업체 마진 반영)
  const distributorPrice = input.totalCost * (1 + distributorMarginRate);
  const distributorMarginAmount = distributorPrice - input.totalCost;

  // 2단계: 중간단가 → 제안단가(세전) (최종 마진 반영)
  const priceBeforeTax =
    input.marginType === "RATE"
      ? distributorPrice * (1 + input.marginValue)
      : distributorPrice + input.marginValue;
  const finalMarginAmount = priceBeforeTax - distributorPrice;

  const grossProfit = priceBeforeTax - input.totalCost;
  const grossProfitRate = priceBeforeTax === 0 ? 0 : grossProfit / priceBeforeTax;
  const priceAfterTax = priceBeforeTax * (1 + vatRate);

  let priceDifference: number | null = null;
  let priceDifferenceRate: number | null = null;
  if (input.retailPrice !== undefined && input.retailPrice !== null) {
    priceDifference = input.retailPrice - priceAfterTax;
    priceDifferenceRate = input.retailPrice === 0 ? 0 : priceDifference / input.retailPrice;
  }

  return {
    distributorPrice,
    distributorMarginAmount,
    priceBeforeTax,
    finalMarginAmount,
    grossProfit,
    grossProfitRate,
    priceAfterTax,
    priceDifference,
    priceDifferenceRate,
  };
}

export interface BomValidationResult {
  valid: boolean;
  errors: string[];
}

const TOLERANCE = 1e-6;

export function validateBom(lines: BomLineInput[]): BomValidationResult {
  const errors: string[] = [];
  const groupMixRatios = new Map<string, number>();
  const groupBlendSums = new Map<string, number>();

  for (const line of lines) {
    const blendRatio = line.blendRatio ?? 1;

    if (groupMixRatios.has(line.groupCode)) {
      const existing = groupMixRatios.get(line.groupCode)!;
      if (Math.abs(existing - line.mixRatio) > TOLERANCE) {
        errors.push(
          `제품형태 "${line.groupCode}"의 배합비 값이 일치하지 않습니다 (${existing} vs ${line.mixRatio}).`
        );
      }
    } else {
      groupMixRatios.set(line.groupCode, line.mixRatio);
    }

    groupBlendSums.set(line.groupCode, (groupBlendSums.get(line.groupCode) ?? 0) + blendRatio);
  }

  const totalMixRatio = Array.from(groupMixRatios.values()).reduce((a, b) => a + b, 0);
  if (Math.abs(totalMixRatio - 1) > TOLERANCE) {
    errors.push(`배합비 합계가 1이 아닙니다 (현재 합계: ${totalMixRatio}).`);
  }

  for (const [groupCode, sum] of groupBlendSums.entries()) {
    if (Math.abs(sum - 1) > TOLERANCE) {
      errors.push(`제품형태 "${groupCode}"의 혼합비율 합계가 1이 아닙니다 (현재 합계: ${sum}).`);
    }
  }

  return { valid: errors.length === 0, errors };
}

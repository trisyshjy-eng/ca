import { describe, expect, it } from "vitest";
import {
  calcBomLine,
  calcCost,
  calcCostPer100g,
  calcPriceProposal,
  calcRawMaterialWeight,
  validateBom,
  type BomLineInput,
} from "./costEngine";

describe("원물 기본 계산", () => {
  it("원물중량 = 구매중량 × 수율", () => {
    expect(calcRawMaterialWeight({ unitCost: 82500, purchaseWeight: 6000, yieldRate: 0.85 })).toBeCloseTo(5100);
  });

  it("100g당원가 = 원물원가 ÷ 원물중량 × 100", () => {
    expect(calcCostPer100g({ unitCost: 82500, purchaseWeight: 6000, yieldRate: 0.85 })).toBeCloseTo(1617.6471, 3);
    expect(calcCostPer100g({ unitCost: 69000, purchaseWeight: 5400, yieldRate: 0.82 })).toBeCloseTo(1558.2656, 3);
    expect(calcCostPer100g({ unitCost: 1241525, purchaseWeight: 215924, yieldRate: 0.98 })).toBeCloseTo(586.7162, 2);
  });
});

describe("BOM 라인 계산 (배합비/혼합비율 반영)", () => {
  const targetWeight = 300;
  const thaiShrimp: BomLineInput = {
    groupCode: "주꾸미",
    mixRatio: 0.5,
    blendRatio: 0.8,
    rawMaterial: { unitCost: 82500, purchaseWeight: 6000, yieldRate: 0.85 },
  };
  const vnShrimp: BomLineInput = {
    groupCode: "주꾸미",
    mixRatio: 0.5,
    blendRatio: 0.2,
    rawMaterial: { unitCost: 69000, purchaseWeight: 5400, yieldRate: 0.82 },
  };
  const sauce: BomLineInput = {
    groupCode: "소스",
    mixRatio: 0.3,
    rawMaterial: { unitCost: 1241525, purchaseWeight: 215924, yieldRate: 0.98 },
  };

  it("실사용중량과 제조중량단가를 정확히 계산한다", () => {
    const thaiResult = calcBomLine(targetWeight, thaiShrimp);
    expect(thaiResult.ratioWeight).toBeCloseTo(150);
    expect(thaiResult.actualWeight).toBeCloseTo(120);
    expect(thaiResult.lineCost).toBeCloseTo((120 * 1617.6471) / 100, 2);

    const vnResult = calcBomLine(targetWeight, vnShrimp);
    expect(vnResult.actualWeight).toBeCloseTo(30);

    const sauceResult = calcBomLine(targetWeight, sauce);
    expect(sauceResult.blendRatio).toBe(1); // 혼합비율 미지정 시 1
    expect(sauceResult.actualWeight).toBeCloseTo(90);
  });

  it("배합비 슬롯의 배합비/혼합비율 검증 (표고 20% 슬롯 포함)", () => {
    const mushroom: BomLineInput = {
      groupCode: "표고",
      mixRatio: 0.2,
      rawMaterial: { unitCost: 10000, purchaseWeight: 1000, yieldRate: 1 },
    };
    const result = validateBom([thaiShrimp, vnShrimp, sauce, mushroom]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("배합비 합계가 1이 아니면 경고를 반환한다", () => {
    const result = validateBom([sauce, thaiShrimp]); // 0.3 + 0.5 = 0.8
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("배합비 합계"))).toBe(true);
  });

  it("동일 슬롯 내 혼합비율 합계가 1이 아니면 경고를 반환한다", () => {
    const badVn: BomLineInput = { ...vnShrimp, blendRatio: 0.1 }; // 0.8 + 0.1 = 0.9
    const result = validateBom([thaiShrimp, badVn, sauce]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("혼합비율 합계"))).toBe(true);
  });
});

describe("제조원가 종합 계산 (첨부 원가분석 예시 기준, 표고 원가 제외)", () => {
  // 스펙 7-8 예시: 소스 30% + 주꾸미 50%(태국80%+베트남20%) + 표고 20%.
  // 예시 표에는 표고의 원물원가 데이터가 없어 재료비 3종(소스/태국/베트남)만으로 검증한다.
  it("재료비/제조원가/제안단가를 계산한다", () => {
    const result = calcCost({
      targetWeight: 300,
      bomLines: [
        {
          groupCode: "소스",
          mixRatio: 0.3,
          rawMaterial: { unitCost: 1241525, purchaseWeight: 215924, yieldRate: 0.98 },
        },
        {
          groupCode: "주꾸미",
          mixRatio: 0.5,
          blendRatio: 0.8,
          rawMaterial: { unitCost: 82500, purchaseWeight: 6000, yieldRate: 0.85 },
        },
        {
          groupCode: "주꾸미",
          mixRatio: 0.5,
          blendRatio: 0.2,
          rawMaterial: { unitCost: 69000, purchaseWeight: 5400, yieldRate: 0.82 },
        },
      ],
      laborLines: [],
      overheadLines: [],
      packagingLines: [{ unitPrice: 100, quantity: 1 }],
    });

    // 528.04(소스) + 1941.18(태국) + 467.48(베트남) ≈ 2936.70
    expect(result.materialCost).toBeCloseTo(2936.7, 0);
    expect(result.packagingCost).toBe(100);
    expect(result.manufacturingCost).toBeCloseTo(result.materialCost + 100, 4);
    expect(result.totalCost).toBeCloseTo(result.manufacturingCost, 4);
  });
});

describe("마진/부가세/소매가 비교 (스펙 7-5~7-7)", () => {
  it("마진율 적용 시 제안단가(세전/세후)를 계산한다", () => {
    const result = calcPriceProposal({ totalCost: 3404.7, marginType: "RATE", marginValue: 0.3866 });
    expect(result.priceBeforeTax).toBeCloseTo(4721.0, -1);
    expect(result.priceAfterTax).toBeCloseTo(result.priceBeforeTax * 1.1, 4);
  });

  it("고정 마진액 적용 시 제안단가(세전)를 계산한다", () => {
    const result = calcPriceProposal({ totalCost: 3404.7, marginType: "AMOUNT", marginValue: 1315.3 });
    expect(result.priceBeforeTax).toBeCloseTo(4720.0, 0);
    expect(result.grossProfit).toBeCloseTo(1315.3, 4);
  });

  it("결정 소매가 대비 차액/차액비율을 계산한다", () => {
    const result = calcPriceProposal({
      totalCost: 3404.7,
      marginType: "AMOUNT",
      marginValue: 1315.3,
      retailPrice: 5990,
    });
    expect(result.priceAfterTax).toBeCloseTo(5192, 0);
    expect(result.priceDifference).toBeCloseTo(798, 0);
    expect(result.priceDifferenceRate).toBeCloseTo(0.1332, 3);
  });
});

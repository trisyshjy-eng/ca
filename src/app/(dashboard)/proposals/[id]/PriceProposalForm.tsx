"use client";

import { useActionState, useMemo, useState } from "react";
import { createPriceProposal, type PriceProposalFormState } from "../actions";
import { calcPriceProposal } from "@/lib/costEngine";

const initialState: PriceProposalFormState = {};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function PriceProposalForm({
  costCalculationId,
  proposalRequestId,
  totalCost,
}: {
  costCalculationId: string;
  proposalRequestId: string;
  totalCost: number;
}) {
  const [state, formAction, pending] = useActionState(createPriceProposal, initialState);
  const [distributorMarginRate, setDistributorMarginRate] = useState(0);
  const [marginType, setMarginType] = useState<"RATE" | "AMOUNT">("RATE");
  const [marginValue, setMarginValue] = useState(0);

  const preview = useMemo(
    () => calcPriceProposal({ totalCost, distributorMarginRate, marginType, marginValue }),
    [totalCost, distributorMarginRate, marginType, marginValue]
  );

  return (
    <form action={formAction} className="card">
      <input type="hidden" name="costCalculationId" value={costCalculationId} />
      <input type="hidden" name="proposalRequestId" value={proposalRequestId} />
      <h2>제안단가 산출</h2>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        총원가 {fmt(totalCost)}원을 기준으로, 제안업체 마진 → 최종 마진 순서로 단계적으로 적용됩니다.
      </p>
      <div className="form-grid mt-16">
        <div>
          <label htmlFor="distributorMarginRate">제안업체 마진률(0~1)</label>
          <input
            id="distributorMarginRate"
            name="distributorMarginRate"
            type="number"
            step="0.0001"
            defaultValue={0}
            onChange={(e) => setDistributorMarginRate(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label htmlFor="marginType">최종 마진 방식</label>
          <select
            id="marginType"
            name="marginType"
            defaultValue="RATE"
            onChange={(e) => setMarginType(e.target.value as "RATE" | "AMOUNT")}
          >
            <option value="RATE">마진율</option>
            <option value="AMOUNT">마진액</option>
          </select>
        </div>
        <div>
          <label htmlFor="marginValue">최종 마진율(0~1) 또는 마진액(원)</label>
          <input
            id="marginValue"
            name="marginValue"
            type="number"
            step="0.0001"
            required
            onChange={(e) => setMarginValue(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label htmlFor="retailPrice">결정 소매가 (선택)</label>
          <input id="retailPrice" name="retailPrice" type="number" step="0.01" />
        </div>
      </div>

      <div className="card mt-16" style={{ background: "var(--background)", padding: 12 }}>
        <div className="form-grid">
          <div>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>중간단가(제안업체 반영)</span>
            <div>{fmt(preview.distributorPrice)}원</div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>제안업체 마진액(세전)</span>
            <div>
              <strong>{fmt(preview.distributorMarginAmount)}</strong>원
            </div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>최종 마진액(세전)</span>
            <div>
              <strong>{fmt(preview.finalMarginAmount)}</strong>원
            </div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>제안단가(세전) 미리보기</span>
            <div>
              <strong>{fmt(preview.priceBeforeTax)}</strong>원
            </div>
          </div>
        </div>
      </div>

      {state?.error && <p className="login-error mt-16">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "산출 중..." : "제안단가 산출"}
      </button>
    </form>
  );
}

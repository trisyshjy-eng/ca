"use client";

import { useActionState } from "react";
import type { OverheadRate } from "@prisma/client";
import { runCostCalculation, type CalculationFormState } from "../actions";

const initialState: CalculationFormState = {};

const CATEGORY_LABELS: Record<string, string> = {
  MANUFACTURING: "제조간접비",
  OUTSOURCING: "외주가공비",
};

export function CalculationForm({
  proposalRequestId,
  overheadRates,
}: {
  proposalRequestId: string;
  overheadRates: OverheadRate[];
}) {
  const [state, formAction, pending] = useActionState(runCostCalculation, initialState);

  return (
    <form action={formAction} className="card">
      <input type="hidden" name="proposalRequestId" value={proposalRequestId} />
      <h2>원가 계산</h2>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        적용할 제조간접비/외주가공비 배부율을 선택하세요.
      </p>
      <div className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {overheadRates.map((o) => (
          <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", color: "var(--foreground)" }}>
            <input type="checkbox" name="overheadRateIds" value={o.id} style={{ width: "auto" }} />
            <span className="badge">{CATEGORY_LABELS[o.category]}</span>
            {o.name} ({(o.rate * 100).toFixed(2)}%, {o.base === "MATERIAL_COST" ? "재료비 대비" : "노무비 대비"})
          </label>
        ))}
        {overheadRates.length === 0 && <p className="text-muted">등록된 배부율이 없습니다.</p>}
      </div>
      <div className="form-grid mt-16">
        <div>
          <label htmlFor="outsourcingCost">외주가공비 (직접입력, 없으면 0)</label>
          <input id="outsourcingCost" name="outsourcingCost" type="number" step="0.01" defaultValue={0} />
        </div>
      </div>
      {state?.error && <p className="login-error mt-16">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "계산 중..." : "원가 계산 실행"}
      </button>
    </form>
  );
}

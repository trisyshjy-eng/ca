"use client";

import { useActionState } from "react";
import { createPriceProposal, type PriceProposalFormState } from "../actions";

const initialState: PriceProposalFormState = {};

export function PriceProposalForm({
  costCalculationId,
  proposalRequestId,
}: {
  costCalculationId: string;
  proposalRequestId: string;
}) {
  const [state, formAction, pending] = useActionState(createPriceProposal, initialState);

  return (
    <form action={formAction} className="card">
      <input type="hidden" name="costCalculationId" value={costCalculationId} />
      <input type="hidden" name="proposalRequestId" value={proposalRequestId} />
      <h2>제안단가 산출</h2>
      <div className="form-grid mt-16">
        <div>
          <label htmlFor="marginType">마진 방식</label>
          <select id="marginType" name="marginType" defaultValue="RATE">
            <option value="RATE">마진율</option>
            <option value="AMOUNT">마진액</option>
          </select>
        </div>
        <div>
          <label htmlFor="marginValue">마진율(0~1) 또는 마진액(원)</label>
          <input id="marginValue" name="marginValue" type="number" step="0.0001" required />
        </div>
        <div>
          <label htmlFor="retailPrice">결정 소매가 (선택)</label>
          <input id="retailPrice" name="retailPrice" type="number" step="0.01" />
        </div>
      </div>
      {state?.error && <p className="login-error mt-16">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "산출 중..." : "제안단가 산출"}
      </button>
    </form>
  );
}

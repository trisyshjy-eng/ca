"use client";

import { useActionState } from "react";
import type { OverheadRate } from "@prisma/client";
import type { OverheadRateFormState } from "./actions";

const initialState: OverheadRateFormState = {};

export function OverheadRateForm({
  action,
  defaultValues,
}: {
  action: (state: OverheadRateFormState | undefined, formData: FormData) => Promise<OverheadRateFormState>;
  defaultValues?: OverheadRate;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card">
      <div className="form-grid">
        <div>
          <label htmlFor="category">구분</label>
          <select id="category" name="category" defaultValue={defaultValues?.category ?? "MANUFACTURING"}>
            <option value="MANUFACTURING">제조간접비</option>
            <option value="OUTSOURCING">외주가공비</option>
          </select>
        </div>
        <div>
          <label htmlFor="base">배부 기준</label>
          <select id="base" name="base" defaultValue={defaultValues?.base ?? "MATERIAL_COST"}>
            <option value="MATERIAL_COST">재료비 대비 %</option>
            <option value="LABOR_COST">노무비 대비 %</option>
          </select>
        </div>
        <div>
          <label htmlFor="name">항목명</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="배부비/유틸리티비/설비간접인건비/전력비 등"
            defaultValue={defaultValues?.name}
            required
          />
        </div>
        <div>
          <label htmlFor="rate">배부율 (0~1, 예: 0.05 = 5%)</label>
          <input
            id="rate"
            name="rate"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={defaultValues?.rate}
            required
          />
        </div>
      </div>
      {state?.error && <p className="login-error mt-16">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}

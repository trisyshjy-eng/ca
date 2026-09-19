"use client";

import { useActionState, useRef, useEffect } from "react";
import type { LaborRate } from "@prisma/client";
import { addProcessLine, type ProcessFormState } from "../actions";

const initialState: ProcessFormState = {};

export function ProcessAddForm({ productId, laborRates }: { productId: string; laborRates: LaborRate[] }) {
  const [state, formAction, pending] = useActionState(addProcessLine, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  return (
    <form action={formAction} ref={formRef} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label htmlFor="laborRateId">공정</label>
        <select id="laborRateId" name="laborRateId" required>
          <option value="">선택</option>
          {laborRates.map((r) => (
            <option key={r.id} value={r.id}>
              {r.processName} ({r.hourlyWage.toLocaleString()}원/시간)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="workHours">작업시간</label>
        <input id="workHours" name="workHours" type="number" step="0.01" required />
      </div>
      <button type="submit" disabled={pending} style={{ marginTop: 0 }}>
        추가
      </button>
      {state?.error && <p className="login-error" style={{ width: "100%" }}>{state.error}</p>}
    </form>
  );
}

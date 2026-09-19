"use client";

import { useActionState } from "react";
import type { RawMaterial } from "@prisma/client";
import type { RawMaterialFormState } from "./actions";

const initialState: RawMaterialFormState = {};

export function RawMaterialForm({
  action,
  defaultValues,
}: {
  action: (state: RawMaterialFormState | undefined, formData: FormData) => Promise<RawMaterialFormState>;
  defaultValues?: RawMaterial;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card">
      <div className="form-grid">
        <div>
          <label htmlFor="name">자재명</label>
          <input id="name" name="name" type="text" defaultValue={defaultValues?.name} required />
        </div>
        <div>
          <label htmlFor="vendor">거래처</label>
          <input id="vendor" name="vendor" type="text" defaultValue={defaultValues?.vendor ?? ""} />
        </div>
        <div>
          <label htmlFor="unitCost">원물원가 (구매 단가, 원)</label>
          <input
            id="unitCost"
            name="unitCost"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.unitCost}
            required
          />
        </div>
        <div>
          <label htmlFor="purchaseWeight">구매중량 (g)</label>
          <input
            id="purchaseWeight"
            name="purchaseWeight"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.purchaseWeight}
            required
          />
        </div>
        <div>
          <label htmlFor="yieldRate">수율/보존율 (0~1)</label>
          <input
            id="yieldRate"
            name="yieldRate"
            type="number"
            step="0.0001"
            min="0"
            max="1"
            defaultValue={defaultValues?.yieldRate}
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

"use client";

import { useActionState } from "react";
import type { LaborRate } from "@prisma/client";
import type { LaborRateFormState } from "./actions";

const initialState: LaborRateFormState = {};

export function LaborRateForm({
  action,
  defaultValues,
}: {
  action: (state: LaborRateFormState | undefined, formData: FormData) => Promise<LaborRateFormState>;
  defaultValues?: LaborRate;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card">
      <div className="form-grid">
        <div>
          <label htmlFor="processName">공정명</label>
          <input id="processName" name="processName" type="text" defaultValue={defaultValues?.processName} required />
        </div>
        <div>
          <label htmlFor="hourlyWage">시간당 임금 (원)</label>
          <input
            id="hourlyWage"
            name="hourlyWage"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.hourlyWage}
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

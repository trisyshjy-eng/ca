"use client";

import { useActionState } from "react";
import type { Product } from "@prisma/client";
import type { ProductFormState } from "./actions";

const initialState: ProductFormState = {};

export function ProductForm({
  action,
  defaultValues,
}: {
  action: (state: ProductFormState | undefined, formData: FormData) => Promise<ProductFormState>;
  defaultValues?: Product;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card">
      <div className="form-grid">
        <div>
          <label htmlFor="name">제품명</label>
          <input id="name" name="name" type="text" defaultValue={defaultValues?.name} required />
        </div>
        <div>
          <label htmlFor="targetWeight">목표 패키지(구성중량, g)</label>
          <input
            id="targetWeight"
            name="targetWeight"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.targetWeight}
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

"use client";

import { useActionState, useRef, useEffect } from "react";
import { addPackagingLine, type PackagingFormState } from "../actions";

const initialState: PackagingFormState = {};

export function PackagingAddForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(addPackagingLine, initialState);
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
        <label htmlFor="pkgName">포장재명</label>
        <input id="pkgName" name="name" type="text" required />
      </div>
      <div>
        <label htmlFor="unitPrice">단가</label>
        <input id="unitPrice" name="unitPrice" type="number" step="0.01" required />
      </div>
      <div>
        <label htmlFor="quantity">수량</label>
        <input id="quantity" name="quantity" type="number" step="0.01" defaultValue={1} required />
      </div>
      <button type="submit" disabled={pending} style={{ marginTop: 0 }}>
        추가
      </button>
      {state?.error && <p className="login-error" style={{ width: "100%" }}>{state.error}</p>}
    </form>
  );
}

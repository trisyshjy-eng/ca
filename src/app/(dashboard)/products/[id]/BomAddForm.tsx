"use client";

import { useActionState, useRef, useEffect } from "react";
import type { RawMaterial } from "@prisma/client";
import { addBomLine, type BomFormState } from "../actions";

const initialState: BomFormState = {};

export function BomAddForm({ productId, rawMaterials }: { productId: string; rawMaterials: RawMaterial[] }) {
  const [state, formAction, pending] = useActionState(addBomLine, initialState);
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
        <label htmlFor="rawMaterialId">구성품목</label>
        <select id="rawMaterialId" name="rawMaterialId" required>
          <option value="">선택</option>
          {rawMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.origin ? ` (${m.origin})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="groupCode">제품형태</label>
        <input id="groupCode" name="groupCode" type="text" placeholder="예: 소스" required />
      </div>
      <div>
        <label htmlFor="mixRatio">배합비 (0~1)</label>
        <input id="mixRatio" name="mixRatio" type="number" step="0.0001" min="0" max="1" required />
      </div>
      <div>
        <label htmlFor="blendRatio">혼합비율 (0~1, 기본 1)</label>
        <input id="blendRatio" name="blendRatio" type="number" step="0.0001" min="0" max="1" defaultValue={1} />
      </div>
      <button type="submit" disabled={pending} style={{ marginTop: 0 }}>
        추가
      </button>
      {state?.error && <p className="login-error" style={{ width: "100%" }}>{state.error}</p>}
    </form>
  );
}

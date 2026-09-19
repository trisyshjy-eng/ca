"use client";

import { useActionState } from "react";
import type { Product } from "@prisma/client";
import { createProposalRequest, type ProposalFormState } from "./actions";

const initialState: ProposalFormState = {};

export function ProposalForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = useActionState(createProposalRequest, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card">
      <div className="form-grid">
        <div>
          <label htmlFor="companyName">업체명</label>
          <input id="companyName" name="companyName" type="text" required />
        </div>
        <div>
          <label htmlFor="contactPerson">담당자</label>
          <input id="contactPerson" name="contactPerson" type="text" required />
        </div>
        <div>
          <label htmlFor="productId">품목</label>
          <select id="productId" name="productId" required>
            <option value="">선택</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="requestDate">요청일</label>
          <input id="requestDate" name="requestDate" type="date" defaultValue={today} required />
        </div>
        <div>
          <label htmlFor="requestedQty">요청수량</label>
          <input id="requestedQty" name="requestedQty" type="number" step="0.01" required />
        </div>
      </div>
      {state?.error && <p className="login-error mt-16">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "등록 중..." : "등록"}
      </button>
    </form>
  );
}

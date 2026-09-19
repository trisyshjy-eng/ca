"use client";

import { useActionState } from "react";
import type { User } from "@prisma/client";
import type { UserFormState } from "./actions";

const initialState: UserFormState = {};

export function UserForm({
  action,
  defaultValues,
  isCreate,
}: {
  action: (state: UserFormState | undefined, formData: FormData) => Promise<UserFormState>;
  defaultValues?: User;
  isCreate: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card">
      <div className="form-grid">
        {isCreate ? (
          <div>
            <label htmlFor="loginId">아이디</label>
            <input id="loginId" name="loginId" type="text" required />
          </div>
        ) : (
          <div>
            <label>아이디</label>
            <div>{defaultValues?.loginId}</div>
          </div>
        )}
        <div>
          <label htmlFor="name">이름</label>
          <input id="name" name="name" type="text" defaultValue={defaultValues?.name} required />
        </div>
        <div>
          <label htmlFor="password">{isCreate ? "비밀번호 (8자 이상)" : "새 비밀번호 (변경 시에만 입력)"}</label>
          <input id="password" name="password" type="password" minLength={8} required={isCreate} />
        </div>
        <div>
          <label htmlFor="role">역할</label>
          <select id="role" name="role" defaultValue={defaultValues?.role ?? "STAFF"}>
            <option value="ADMIN">관리자</option>
            <option value="STAFF">담당자</option>
            <option value="VIEWER">조회자</option>
          </select>
        </div>
      </div>
      {state?.error && <p className="login-error mt-16">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <div className="login-page">
      <form action={action} className="login-form">
        <h1>제조원가 기반 제안단가 산출 시스템</h1>
        <p className="login-subtitle">로그인하여 계속하세요</p>

        <label htmlFor="loginId">아이디</label>
        <input id="loginId" name="loginId" type="text" autoComplete="username" required />

        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />

        {state?.error && <p className="login-error">{state.error}</p>}

        <button type="submit" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

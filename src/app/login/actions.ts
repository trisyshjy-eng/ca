"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";

const LoginSchema = z.object({
  loginId: z.string().min(1, { message: "아이디를 입력해 주세요." }),
  password: z.string().min(1, { message: "비밀번호를 입력해 주세요." }),
});

export interface LoginFormState {
  error?: string;
}

export async function login(
  _prevState: LoginFormState | undefined,
  formData: FormData
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const { loginId, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    loginId: user.loginId,
  });

  redirect("/dashboard");
}

"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { logHistory } from "@/lib/history";

const CreateUserSchema = z.object({
  loginId: z.string().min(1, "아이디를 입력해 주세요."),
  name: z.string().min(1, "이름을 입력해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]),
});

export interface UserFormState {
  error?: string;
}

export async function createUser(
  _prevState: UserFormState | undefined,
  formData: FormData
): Promise<UserFormState> {
  const session = await requireRole("ADMIN");
  const parsed = CreateUserSchema.safeParse({
    loginId: formData.get("loginId"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const existing = await prisma.user.findUnique({ where: { loginId: parsed.data.loginId } });
  if (existing) return { error: "이미 사용 중인 아이디입니다." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      loginId: parsed.data.loginId,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
  });

  await logHistory({
    entityType: "User",
    entityId: created.id,
    after: { loginId: created.loginId, name: created.name, role: created.role },
    changedById: session.userId,
  });

  revalidatePath("/users");
  redirect("/users");
}

const UpdateUserSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]),
  password: z.string().optional(),
});

export async function updateUser(
  id: string,
  _prevState: UserFormState | undefined,
  formData: FormData
): Promise<UserFormState> {
  const session = await requireRole("ADMIN");
  const rawPassword = formData.get("password");
  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    password: rawPassword ? rawPassword : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  if (parsed.data.password && parsed.data.password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const before = await prisma.user.findUnique({ where: { id } });
  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined,
    },
  });

  await logHistory({
    entityType: "User",
    entityId: id,
    before: before ? { loginId: before.loginId, name: before.name, role: before.role } : undefined,
    after: { loginId: updated.loginId, name: updated.name, role: updated.role },
    changedById: session.userId,
  });

  revalidatePath("/users");
  redirect("/users");
}

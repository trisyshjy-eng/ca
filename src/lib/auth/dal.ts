import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { decryptSession, getSessionToken, type SessionPayload } from "./session";

export const verifySession = cache(async (): Promise<SessionPayload | null> => {
  const token = await getSessionToken();
  return decryptSession(token);
});

export async function requireSession(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

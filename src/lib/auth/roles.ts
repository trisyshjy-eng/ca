import type { UserRole } from "@prisma/client";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "관리자",
  STAFF: "담당자",
  VIEWER: "조회자",
};

export const NAV_ITEMS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "대시보드", roles: ["ADMIN", "STAFF", "VIEWER"] },
  { href: "/proposals", label: "제안요청 관리", roles: ["ADMIN", "STAFF", "VIEWER"] },
  { href: "/materials", label: "원가 마스터 관리", roles: ["ADMIN", "STAFF"] },
  { href: "/products", label: "품목 관리", roles: ["ADMIN", "STAFF"] },
  { href: "/history", label: "산출 이력 조회", roles: ["ADMIN", "STAFF", "VIEWER"] },
  { href: "/users", label: "사용자/권한 관리", roles: ["ADMIN"] },
];

import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { ROLE_LABELS, NAV_ITEMS } from "@/lib/auth/roles";
import { logout } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(session.role));

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">제안단가 산출 시스템</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="user-info">
          <div>{session.name}</div>
          <div>{ROLE_LABELS[session.role]}</div>
          <form action={logout}>
            <button type="submit" className="secondary" style={{ marginTop: 8, width: "100%" }}>
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}

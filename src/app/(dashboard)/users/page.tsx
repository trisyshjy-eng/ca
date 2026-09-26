import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";

export default async function UsersPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <div className="page-header">
        <h1>사용자/권한 관리</h1>
      </div>

      <div className="actions-row">
        <Link href="/users/new">
          <button type="button">+ 사용자 등록</button>
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>이름</th>
              <th>역할</th>
              <th>등록일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.loginId}</td>
                <td>{u.name}</td>
                <td>
                  <span className="badge">{ROLE_LABELS[u.role]}</span>
                </td>
                <td>{formatDate(u.createdAt)}</td>
                <td>
                  <Link href={`/users/${u.id}/edit`}>수정</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

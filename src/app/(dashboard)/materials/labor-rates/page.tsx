import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { deleteLaborRate } from "./actions";

export default async function LaborRatesPage() {
  await requireRole("ADMIN", "STAFF");

  const rates = await prisma.laborRate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="page-header">
        <h1>노무비 마스터 관리</h1>
        <Link href="/materials">← 원가 마스터로</Link>
      </div>

      <div className="actions-row">
        <Link href="/materials/labor-rates/new">
          <button type="button">+ 공정 등록</button>
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>공정명</th>
              <th className="text-right">시간당 임금</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td>{r.processName}</td>
                <td className="text-right">{r.hourlyWage.toLocaleString()}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/materials/labor-rates/${r.id}/edit`}>수정</Link>
                    <form action={deleteLaborRate}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                        비활성화
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  등록된 공정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

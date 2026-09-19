import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { deleteOverheadRate } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  MANUFACTURING: "제조간접비",
  OUTSOURCING: "외주가공비",
};

const BASE_LABELS: Record<string, string> = {
  MATERIAL_COST: "재료비 대비",
  LABOR_COST: "노무비 대비",
};

export default async function OverheadRatesPage() {
  await requireRole("ADMIN", "STAFF");

  const rates = await prisma.overheadRate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="page-header">
        <h1>제조간접비/외주가공비 배부율 관리</h1>
        <Link href="/materials">← 원가 마스터로</Link>
      </div>

      <div className="actions-row">
        <Link href="/materials/overhead-rates/new">
          <button type="button">+ 배부율 등록</button>
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>구분</th>
              <th>항목명</th>
              <th>배부 기준</th>
              <th className="text-right">배부율</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="badge">{CATEGORY_LABELS[r.category]}</span>
                </td>
                <td>{r.name}</td>
                <td>{BASE_LABELS[r.base]}</td>
                <td className="text-right">{(r.rate * 100).toFixed(2)}%</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/materials/overhead-rates/${r.id}/edit`}>수정</Link>
                    <form action={deleteOverheadRate}>
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
                <td colSpan={5} className="text-muted">
                  등록된 배부율이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

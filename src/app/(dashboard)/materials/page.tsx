import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { calcCostPer100g, calcRawMaterialWeight } from "@/lib/costEngine";
import { deleteRawMaterial } from "./actions";

export default async function MaterialsPage() {
  await requireRole("ADMIN", "STAFF");

  const materials = await prisma.rawMaterial.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="page-header">
        <h1>원가 마스터 관리 - 원물/자재</h1>
      </div>

      <div className="actions-row">
        <Link href="/materials/new">
          <button type="button">+ 원물 등록</button>
        </Link>
        <Link href="/materials/labor-rates">
          <button type="button" className="secondary">
            노무비 마스터
          </button>
        </Link>
        <Link href="/materials/overhead-rates">
          <button type="button" className="secondary">
            제조간접비/외주가공비 배부율
          </button>
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>자재명</th>
              <th>거래처</th>
              <th className="text-right">원물원가</th>
              <th className="text-right">구매중량(g)</th>
              <th className="text-right">수율</th>
              <th className="text-right">원물중량(g)</th>
              <th className="text-right">100g당원가</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.vendor ?? "-"}</td>
                <td className="text-right">{m.unitCost.toLocaleString()}</td>
                <td className="text-right">{m.purchaseWeight.toLocaleString()}</td>
                <td className="text-right">{(m.yieldRate * 100).toFixed(1)}%</td>
                <td className="text-right">
                  {calcRawMaterialWeight(m).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </td>
                <td className="text-right">
                  {calcCostPer100g(m).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/materials/${m.id}/edit`}>수정</Link>
                    <form action={deleteRawMaterial}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                        비활성화
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted">
                  등록된 원물/자재가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

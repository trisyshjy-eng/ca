import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { archiveProduct } from "./actions";

export default async function ProductsPage() {
  await requireRole("ADMIN", "STAFF");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bom: true, packagingCosts: true, processes: true } } },
  });

  return (
    <div>
      <div className="page-header">
        <h1>품목 관리</h1>
      </div>

      <div className="actions-row">
        <Link href="/products/new">
          <button type="button">+ 품목 등록</button>
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>제품명</th>
              <th className="text-right">목표 패키지(g)</th>
              <th className="text-right">배합 항목</th>
              <th className="text-right">포장재</th>
              <th className="text-right">공정</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/products/${p.id}`}>{p.name}</Link>
                </td>
                <td className="text-right">{p.targetWeight.toLocaleString()}</td>
                <td className="text-right">{p._count.bom}</td>
                <td className="text-right">{p._count.packagingCosts}</td>
                <td className="text-right">{p._count.processes}</td>
                <td>
                  <form action={archiveProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                      비활성화
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  등록된 품목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

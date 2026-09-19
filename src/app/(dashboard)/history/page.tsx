import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string }>;
}) {
  const session = await requireSession();
  const canSeeCostDetail = session.role === "ADMIN" || session.role === "STAFF";
  const { company, from, to } = await searchParams;

  const calculations = await prisma.costCalculation.findMany({
    where: {
      proposalRequest: {
        companyName: company ? { contains: company } : undefined,
        requestDate: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
    },
    include: {
      proposalRequest: { include: { product: true } },
      priceProposals: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { calculatedAt: "desc" },
    take: 100,
  });

  const recentChanges = canSeeCostDetail
    ? await prisma.historyLog.findMany({
        include: { changedBy: true },
        orderBy: { changedAt: "desc" },
        take: 30,
      })
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>산출 이력 조회</h1>
      </div>

      <form className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label htmlFor="company">업체명</label>
          <input id="company" name="company" type="text" defaultValue={company} />
        </div>
        <div>
          <label htmlFor="from">요청일(시작)</label>
          <input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <label htmlFor="to">요청일(종료)</label>
          <input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <button type="submit" style={{ marginTop: 0 }}>
          검색
        </button>
      </form>

      <div className="card">
        <h2>원가/제안단가 산출 이력</h2>
        <table className="mt-16">
          <thead>
            <tr>
              <th>업체명</th>
              <th>품목</th>
              {canSeeCostDetail && <th className="text-right">제조원가</th>}
              {canSeeCostDetail && <th className="text-right">총원가</th>}
              <th className="text-right">제안단가(세후)</th>
              <th>계산일시</th>
            </tr>
          </thead>
          <tbody>
            {calculations.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/proposals/${c.proposalRequestId}`}>{c.proposalRequest.companyName}</Link>
                </td>
                <td>{c.proposalRequest.product.name}</td>
                {canSeeCostDetail && <td className="text-right">{fmt(c.manufacturingCost)}</td>}
                {canSeeCostDetail && <td className="text-right">{fmt(c.totalCost)}</td>}
                <td className="text-right">{c.priceProposals[0] ? fmt(c.priceProposals[0].priceAfterTax) : "-"}</td>
                <td>{c.calculatedAt.toLocaleString("ko-KR")}</td>
              </tr>
            ))}
            {calculations.length === 0 && (
              <tr>
                <td colSpan={canSeeCostDetail ? 6 : 4} className="text-muted">
                  조회된 산출 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canSeeCostDetail && (
        <div className="card">
          <h2>변경 이력 로그 (최근 30건)</h2>
          <table className="mt-16">
            <thead>
              <tr>
                <th>대상</th>
                <th>변경자</th>
                <th>변경일시</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {recentChanges.map((log) => (
                <tr key={log.id}>
                  <td>
                    {log.entityType} <span className="text-muted">({log.entityId.slice(0, 8)})</span>
                  </td>
                  <td>{log.changedBy.name}</td>
                  <td>{log.changedAt.toLocaleString("ko-KR")}</td>
                  <td>
                    <details>
                      <summary>보기</summary>
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        <div>
                          <div className="text-muted">변경 전</div>
                          <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>
                            {log.beforeData ?? "-"}
                          </pre>
                        </div>
                        <div>
                          <div className="text-muted">변경 후</div>
                          <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>
                            {log.afterData ?? "-"}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {recentChanges.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    변경 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

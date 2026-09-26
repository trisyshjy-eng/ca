import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const session = await requireSession();

  const [openRequests, recentCalculations] = await Promise.all([
    prisma.proposalRequest.findMany({
      where: { status: { in: ["REQUESTED", "CALCULATING", "PRICED"] } },
      include: { product: true },
      orderBy: { requestDate: "desc" },
      take: 10,
    }),
    prisma.costCalculation.findMany({
      include: { proposalRequest: { include: { product: true } } },
      orderBy: { calculatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>대시보드</h1>
        <span className="text-muted">{session.name}님 환영합니다</span>
      </div>

      <div className="card">
        <h2>진행 중인 제안요청 ({openRequests.length})</h2>
        <table className="mt-16">
          <thead>
            <tr>
              <th>업체명</th>
              <th>품목</th>
              <th>요청일</th>
              <th>요청수량</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {openRequests.map((req) => (
              <tr key={req.id}>
                <td>{req.companyName}</td>
                <td>{req.product.name}</td>
                <td>{formatDate(req.requestDate)}</td>
                <td>{req.requestedQty.toLocaleString()}</td>
                <td>
                  <span className="badge">{req.status}</span>
                </td>
              </tr>
            ))}
            {openRequests.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  진행 중인 제안요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>최근 산출 이력 ({recentCalculations.length})</h2>
        <table className="mt-16">
          <thead>
            <tr>
              <th>업체명</th>
              <th>품목</th>
              <th>제조원가</th>
              <th>총원가</th>
              <th>계산일시</th>
            </tr>
          </thead>
          <tbody>
            {recentCalculations.map((calc) => (
              <tr key={calc.id}>
                <td>{calc.proposalRequest.companyName}</td>
                <td>{calc.proposalRequest.product.name}</td>
                <td>{Math.round(calc.manufacturingCost).toLocaleString()}</td>
                <td>{Math.round(calc.totalCost).toLocaleString()}</td>
                <td>{formatDateTime(calc.calculatedAt)}</td>
              </tr>
            ))}
            {recentCalculations.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  산출 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

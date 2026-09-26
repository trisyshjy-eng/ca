import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { deleteProposalRequest } from "./actions";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "접수",
  CALCULATING: "원가계산중",
  PRICED: "제안단가 산출됨",
  APPROVED: "승인",
  SENT: "발송완료",
  REJECTED: "반려",
};

export default async function ProposalsPage() {
  const session = await requireSession();
  const canManage = session.role === "ADMIN" || session.role === "STAFF";

  const proposals = await prisma.proposalRequest.findMany({
    include: { product: true },
    orderBy: { requestDate: "desc" },
  });

  return (
    <div>
      <div className="page-header">
        <h1>제안요청 관리</h1>
      </div>

      {canManage && (
        <div className="actions-row">
          <Link href="/proposals/new">
            <button type="button">+ 제안요청 등록</button>
          </Link>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>업체명</th>
              <th>담당자</th>
              <th>품목</th>
              <th>요청일</th>
              <th className="text-right">요청수량</th>
              <th>상태</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/proposals/${p.id}`}>{p.companyName}</Link>
                </td>
                <td>{p.contactPerson}</td>
                <td>{p.product.name}</td>
                <td>{formatDate(p.requestDate)}</td>
                <td className="text-right">{p.requestedQty.toLocaleString()}</td>
                <td>
                  <span className="badge">{STATUS_LABELS[p.status]}</span>
                </td>
                {canManage && (
                  <td>
                    <form action={deleteProposalRequest}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                        삭제
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {proposals.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="text-muted">
                  등록된 제안요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

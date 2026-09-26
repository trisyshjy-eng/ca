import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { CalculationForm } from "./CalculationForm";
import { PriceProposalForm } from "./PriceProposalForm";
import { decidePriceProposal, markProposalSent } from "../actions";
import { calcPriceProposal } from "@/lib/costEngine";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "접수",
  CALCULATING: "원가계산중",
  PRICED: "제안단가 산출됨",
  APPROVED: "승인",
  SENT: "발송완료",
  REJECTED: "반려",
};

const APPROVAL_LABELS: Record<string, string> = {
  PENDING: "승인대기",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const canManage = session.role === "ADMIN" || session.role === "STAFF";
  const canApprove = session.role === "ADMIN";

  const proposal = await prisma.proposalRequest.findUnique({
    where: { id },
    include: {
      product: true,
      requestedBy: true,
      calculations: {
        orderBy: { calculatedAt: "desc" },
        include: {
          calculatedBy: true,
          priceProposals: {
            orderBy: { createdAt: "desc" },
            include: { approvedBy: true },
          },
        },
      },
    },
  });
  if (!proposal) notFound();

  const overheadRates = canManage
    ? await prisma.overheadRate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    : [];

  const latestCalculation = proposal.calculations[0];

  return (
    <div>
      <div className="page-header">
        <h1>{proposal.companyName} - {proposal.product.name}</h1>
        <Link href="/proposals">← 목록으로</Link>
      </div>

      <div className="card">
        <div className="form-grid">
          <div>
            <span className="text-muted">담당자</span>
            <div>{proposal.contactPerson}</div>
          </div>
          <div>
            <span className="text-muted">요청일</span>
            <div>{formatDate(proposal.requestDate)}</div>
          </div>
          <div>
            <span className="text-muted">요청수량</span>
            <div>{proposal.requestedQty.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted">상태</span>
            <div>
              <span className="badge">{STATUS_LABELS[proposal.status]}</span>
            </div>
          </div>
          <div>
            <span className="text-muted">등록자</span>
            <div>{proposal.requestedBy.name}</div>
          </div>
        </div>

        {canManage && latestCalculation?.priceProposals[0] && (
          <div className="actions-row mt-16" style={{ marginBottom: 0 }}>
            <a href={`/api/proposals/${proposal.id}/pdf`}>
              <button type="button" className="secondary">
                제안서 PDF 다운로드
              </button>
            </a>
            <a href={`/api/proposals/${proposal.id}/excel`}>
              <button type="button" className="secondary">
                견적서 엑셀 다운로드
              </button>
            </a>
          </div>
        )}

        {proposal.status === "APPROVED" && canManage && (
          <form action={markProposalSent} className="mt-16">
            <input type="hidden" name="id" value={proposal.id} />
            <button type="submit">제안서 발송 처리</button>
          </form>
        )}
      </div>

      {canManage && <CalculationForm proposalRequestId={proposal.id} overheadRates={overheadRates} />}

      {latestCalculation && (
        <div className="card">
          {canManage ? (
            <>
              <h2>최근 원가 계산 결과</h2>
              <table className="mt-16">
                <thead>
                  <tr>
                    <th className="text-right">재료비</th>
                    <th className="text-right">노무비</th>
                    <th className="text-right">제조간접비</th>
                    <th className="text-right">포장비</th>
                    <th className="text-right">제조원가</th>
                    <th className="text-right">외주가공비</th>
                    <th className="text-right">총원가</th>
                    <th>계산일시</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-right">{fmt(latestCalculation.materialCost)}</td>
                    <td className="text-right">{fmt(latestCalculation.laborCost)}</td>
                    <td className="text-right">{fmt(latestCalculation.overheadCost)}</td>
                    <td className="text-right">{fmt(latestCalculation.packagingCost)}</td>
                    <td className="text-right">{fmt(latestCalculation.manufacturingCost)}</td>
                    <td className="text-right">{fmt(latestCalculation.outsourcingCost)}</td>
                    <td className="text-right">
                      <strong>{fmt(latestCalculation.totalCost)}</strong>
                    </td>
                    <td>{formatDateTime(latestCalculation.calculatedAt)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <h2>제안단가 현황</h2>
          )}

          {canManage && (
            <div className="mt-16">
              <PriceProposalForm
                costCalculationId={latestCalculation.id}
                proposalRequestId={proposal.id}
                totalCost={latestCalculation.totalCost}
              />
            </div>
          )}

          {latestCalculation.priceProposals.length > 0 && (
            <table className="mt-16">
              <thead>
                <tr>
                  <th className="text-right">제안업체 마진률</th>
                  <th className="text-right">제안업체 마진액(세전)</th>
                  <th>최종마진방식</th>
                  <th className="text-right">최종마진값</th>
                  <th className="text-right">최종 마진액(세전)</th>
                  <th className="text-right">제안단가(세전)</th>
                  <th className="text-right">제안단가(세후)</th>
                  <th className="text-right">결정소매가</th>
                  <th className="text-right">차액</th>
                  <th className="text-right">차액비율</th>
                  <th>승인상태</th>
                  {canApprove && <th></th>}
                </tr>
              </thead>
              <tbody>
                {latestCalculation.priceProposals.map((pp) => {
                  const preview = calcPriceProposal({
                    totalCost: latestCalculation.totalCost,
                    distributorMarginRate: pp.distributorMarginRate,
                    marginType: pp.marginType,
                    marginValue: pp.marginValue,
                  });
                  return (
                <tr key={pp.id}>
                    <td className="text-right">{(pp.distributorMarginRate * 100).toFixed(2)}%</td>
                    <td className="text-right">{fmt(preview.distributorMarginAmount)}</td>
                    <td>{pp.marginType === "RATE" ? "마진율" : "마진액"}</td>
                    <td className="text-right">
                      {pp.marginType === "RATE" ? `${(pp.marginValue * 100).toFixed(2)}%` : fmt(pp.marginValue)}
                    </td>
                    <td className="text-right">{fmt(preview.finalMarginAmount)}</td>
                    <td className="text-right">{fmt(pp.priceBeforeTax)}</td>
                    <td className="text-right">
                      <strong>{fmt(pp.priceAfterTax)}</strong>
                    </td>
                    <td className="text-right">{pp.retailPrice ? fmt(pp.retailPrice) : "-"}</td>
                    <td className="text-right">{pp.priceDifference !== null ? fmt(pp.priceDifference) : "-"}</td>
                    <td className="text-right">
                      {pp.priceDifferenceRate !== null ? `${(pp.priceDifferenceRate * 100).toFixed(2)}%` : "-"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          pp.approvalStatus === "APPROVED"
                            ? "success"
                            : pp.approvalStatus === "REJECTED"
                              ? "danger"
                              : "warning"
                        }`}
                      >
                        {APPROVAL_LABELS[pp.approvalStatus]}
                      </span>
                    </td>
                    {canApprove && (
                      <td>
                        {pp.approvalStatus === "PENDING" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <form action={decidePriceProposal}>
                              <input type="hidden" name="priceProposalId" value={pp.id} />
                              <input type="hidden" name="proposalRequestId" value={proposal.id} />
                              <input type="hidden" name="decision" value="APPROVED" />
                              <button type="submit" style={{ margin: 0, padding: "2px 8px" }}>
                                승인
                              </button>
                            </form>
                            <form action={decidePriceProposal}>
                              <input type="hidden" name="priceProposalId" value={pp.id} />
                              <input type="hidden" name="proposalRequestId" value={proposal.id} />
                              <input type="hidden" name="decision" value="REJECTED" />
                              <button type="submit" className="danger" style={{ margin: 0, padding: "2px 8px" }}>
                                반려
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-muted">{pp.approvedBy?.name}</span>
                        )}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {canManage && proposal.calculations.length > 1 && (
        <div className="card">
          <h2>이전 원가 계산 이력</h2>
          <table className="mt-16">
            <thead>
              <tr>
                <th className="text-right">제조원가</th>
                <th className="text-right">총원가</th>
                <th>계산자</th>
                <th>계산일시</th>
              </tr>
            </thead>
            <tbody>
              {proposal.calculations.slice(1).map((c) => (
                <tr key={c.id}>
                  <td className="text-right">{fmt(c.manufacturingCost)}</td>
                  <td className="text-right">{fmt(c.totalCost)}</td>
                  <td>{c.calculatedBy.name}</td>
                  <td>{formatDateTime(c.calculatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

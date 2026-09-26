import "server-only";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export async function getProposalDocumentData(proposalRequestId: string) {
  const proposal = await prisma.proposalRequest.findUnique({
    where: { id: proposalRequestId },
    include: {
      product: true,
      requestedBy: true,
      calculations: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
        include: {
          priceProposals: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!proposal) return null;

  const calculation = proposal.calculations[0] ?? null;
  const priceProposal = calculation?.priceProposals[0] ?? null;

  return { proposal, calculation, priceProposal };
}

export type ProposalDocumentData = NonNullable<Awaited<ReturnType<typeof getProposalDocumentData>>>;

function formatNumber(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export function buildProposalHtml(data: ProposalDocumentData): string {
  const { proposal, priceProposal } = data;
  const unitPrice = priceProposal?.priceAfterTax ?? 0;
  const totalAmount = unitPrice * proposal.requestedQty;
  const issuedAt = formatDate(new Date());

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic", "맑은 고딕", sans-serif; color: #1a1d23; padding: 0; margin: 0; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
  .subtitle { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
  th { background: #f3f4f6; width: 140px; }
  .price-table th { background: #eef2ff; text-align: center; }
  .price-table td { text-align: right; }
  .total-row td { font-weight: bold; font-size: 15px; background: #f9fafb; }
  .footer { margin-top: 40px; font-size: 11px; color: #6b7280; text-align: right; }
</style>
</head>
<body>
  <h1>제 안 서</h1>
  <div class="subtitle">발행일: ${issuedAt}</div>

  <table>
    <tr><th>업체명</th><td>${proposal.companyName}</td><th>담당자</th><td>${proposal.contactPerson}</td></tr>
    <tr><th>품목명</th><td>${proposal.product.name}</td><th>요청수량</th><td>${proposal.requestedQty.toLocaleString("ko-KR")}</td></tr>
    <tr><th>요청일</th><td>${formatDate(proposal.requestDate)}</td><th>단위 중량</th><td>${proposal.product.targetWeight.toLocaleString("ko-KR")} g</td></tr>
  </table>

  <table class="price-table">
    <thead>
      <tr><th>항목</th><th>단가(세후, 원)</th><th>수량</th><th>합계금액(원)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align:left">${proposal.product.name}</td>
        <td>${formatNumber(unitPrice)}</td>
        <td>${proposal.requestedQty.toLocaleString("ko-KR")}</td>
        <td>${formatNumber(totalAmount)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align:right">합계</td>
        <td>${formatNumber(totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  ${
    priceProposal?.retailPrice
      ? `<table>
          <tr><th>결정 소매가</th><td>${formatNumber(priceProposal.retailPrice)} 원</td>
          <th>차액</th><td>${priceProposal.priceDifference !== null ? formatNumber(priceProposal.priceDifference) : "-"} 원 (${
            priceProposal.priceDifferenceRate !== null ? (priceProposal.priceDifferenceRate * 100).toFixed(2) : "-"
          }%)</td></tr>
        </table>`
      : ""
  }

  <div class="footer">
    본 제안서는 제조원가 기반 제안단가 산출 시스템에서 자동 생성되었습니다.
  </div>
</body>
</html>`;
}

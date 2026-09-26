import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifySession } from "@/lib/auth/dal";
import { getProposalDocumentData } from "@/lib/documents";
import { calcPriceProposal } from "@/lib/costEngine";
import { formatDate } from "@/lib/format";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "STAFF") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const data = await getProposalDocumentData(id);
  if (!data || !data.calculation || !data.priceProposal) {
    return NextResponse.json({ error: "제안단가가 산출되지 않아 견적서를 생성할 수 없습니다." }, { status: 404 });
  }

  const { proposal, calculation, priceProposal } = data;
  const marginPreview = calcPriceProposal({
    totalCost: calculation.totalCost,
    distributorMarginRate: priceProposal.distributorMarginRate,
    marginType: priceProposal.marginType,
    marginValue: priceProposal.marginValue,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "제조원가 기반 제안단가 산출 시스템";
  const sheet = workbook.addWorksheet("견적서");

  sheet.columns = [
    { header: "항목", key: "label", width: 24 },
    { header: "값", key: "value", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  const rows: [string, string | number][] = [
    ["업체명", proposal.companyName],
    ["담당자", proposal.contactPerson],
    ["품목명", proposal.product.name],
    ["요청일", formatDate(proposal.requestDate)],
    ["요청수량", proposal.requestedQty],
    ["재료비", Math.round(calculation.materialCost)],
    ["노무비", Math.round(calculation.laborCost)],
    ["제조간접비", Math.round(calculation.overheadCost)],
    ["포장비", Math.round(calculation.packagingCost)],
    ["제조원가", Math.round(calculation.manufacturingCost)],
    ["외주가공비", Math.round(calculation.outsourcingCost)],
    ["총원가", Math.round(calculation.totalCost)],
    ["제안업체 마진률", `${(priceProposal.distributorMarginRate * 100).toFixed(2)}%`],
    ["제안업체 마진액(세전)", Math.round(marginPreview.distributorMarginAmount)],
    ["중간단가", Math.round(marginPreview.distributorPrice)],
    ["최종 마진 방식", priceProposal.marginType === "RATE" ? "마진율" : "마진액"],
    [
      "최종 마진 값",
      priceProposal.marginType === "RATE"
        ? `${(priceProposal.marginValue * 100).toFixed(2)}%`
        : Math.round(priceProposal.marginValue),
    ],
    ["최종 마진액(세전)", Math.round(marginPreview.finalMarginAmount)],
    ["제안단가(세전)", Math.round(priceProposal.priceBeforeTax)],
    ["제안단가(세후)", Math.round(priceProposal.priceAfterTax)],
    ["결정 소매가", priceProposal.retailPrice ? Math.round(priceProposal.retailPrice) : "-"],
    ["차액", priceProposal.priceDifference !== null ? Math.round(priceProposal.priceDifference) : "-"],
    [
      "차액비율",
      priceProposal.priceDifferenceRate !== null ? `${(priceProposal.priceDifferenceRate * 100).toFixed(2)}%` : "-",
    ],
    ["합계금액(세후단가 x 수량)", Math.round(priceProposal.priceAfterTax * proposal.requestedQty)],
  ];

  rows.forEach(([label, value]) => sheet.addRow({ label, value }));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="proposal-${id}.xlsx"`,
    },
  });
}

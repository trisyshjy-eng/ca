import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { getProposalDocumentData, buildProposalHtml } from "@/lib/documents";
import { renderHtmlToPdf } from "@/lib/pdf";

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
  if (!data || !data.priceProposal) {
    return NextResponse.json({ error: "제안단가가 산출되지 않아 제안서를 생성할 수 없습니다." }, { status: 404 });
  }

  const html = buildProposalHtml(data);
  const pdfBuffer = await renderHtmlToPdf(html);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${id}.pdf"`,
    },
  });
}

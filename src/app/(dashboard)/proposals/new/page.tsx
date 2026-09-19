import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { ProposalForm } from "../ProposalForm";

export default async function NewProposalPage() {
  await requireRole("ADMIN", "STAFF");
  const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <div className="page-header">
        <h1>제안요청 등록</h1>
      </div>
      <ProposalForm products={products} />
    </div>
  );
}

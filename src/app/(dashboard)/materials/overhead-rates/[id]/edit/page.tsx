import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { OverheadRateForm } from "../../OverheadRateForm";
import { updateOverheadRate } from "../../actions";

export default async function EditOverheadRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;

  const rate = await prisma.overheadRate.findUnique({ where: { id } });
  if (!rate) notFound();

  const boundUpdate = updateOverheadRate.bind(null, id);

  return (
    <div>
      <div className="page-header">
        <h1>배부율 수정 - {rate.name}</h1>
      </div>
      <OverheadRateForm action={boundUpdate} defaultValues={rate} />
    </div>
  );
}

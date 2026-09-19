import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { LaborRateForm } from "../../LaborRateForm";
import { updateLaborRate } from "../../actions";

export default async function EditLaborRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;

  const rate = await prisma.laborRate.findUnique({ where: { id } });
  if (!rate) notFound();

  const boundUpdate = updateLaborRate.bind(null, id);

  return (
    <div>
      <div className="page-header">
        <h1>공정/노무비 수정 - {rate.processName}</h1>
      </div>
      <LaborRateForm action={boundUpdate} defaultValues={rate} />
    </div>
  );
}

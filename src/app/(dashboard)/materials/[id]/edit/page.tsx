import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { RawMaterialForm } from "../../RawMaterialForm";
import { updateRawMaterial } from "../../actions";

export default async function EditRawMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;

  const material = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!material) notFound();

  const boundUpdate = updateRawMaterial.bind(null, id);

  return (
    <div>
      <div className="page-header">
        <h1>원물/자재 수정 - {material.name}</h1>
      </div>
      <RawMaterialForm action={boundUpdate} defaultValues={material} />
    </div>
  );
}

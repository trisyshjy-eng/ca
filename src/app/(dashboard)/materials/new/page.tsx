import { requireRole } from "@/lib/auth/dal";
import { RawMaterialForm } from "../RawMaterialForm";
import { createRawMaterial } from "../actions";

export default async function NewRawMaterialPage() {
  await requireRole("ADMIN", "STAFF");

  return (
    <div>
      <div className="page-header">
        <h1>원물/자재 등록</h1>
      </div>
      <RawMaterialForm action={createRawMaterial} />
    </div>
  );
}

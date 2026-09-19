import { requireRole } from "@/lib/auth/dal";
import { LaborRateForm } from "../LaborRateForm";
import { createLaborRate } from "../actions";

export default async function NewLaborRatePage() {
  await requireRole("ADMIN", "STAFF");

  return (
    <div>
      <div className="page-header">
        <h1>공정/노무비 등록</h1>
      </div>
      <LaborRateForm action={createLaborRate} />
    </div>
  );
}

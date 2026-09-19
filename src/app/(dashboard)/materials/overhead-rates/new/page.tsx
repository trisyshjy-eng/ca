import { requireRole } from "@/lib/auth/dal";
import { OverheadRateForm } from "../OverheadRateForm";
import { createOverheadRate } from "../actions";

export default async function NewOverheadRatePage() {
  await requireRole("ADMIN", "STAFF");

  return (
    <div>
      <div className="page-header">
        <h1>배부율 등록</h1>
      </div>
      <OverheadRateForm action={createOverheadRate} />
    </div>
  );
}

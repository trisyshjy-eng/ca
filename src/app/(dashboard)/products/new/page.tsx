import { requireRole } from "@/lib/auth/dal";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  await requireRole("ADMIN", "STAFF");

  return (
    <div>
      <div className="page-header">
        <h1>품목 등록</h1>
      </div>
      <ProductForm action={createProduct} />
    </div>
  );
}

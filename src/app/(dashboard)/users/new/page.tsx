import { requireRole } from "@/lib/auth/dal";
import { UserForm } from "../UserForm";
import { createUser } from "../actions";

export default async function NewUserPage() {
  await requireRole("ADMIN");

  return (
    <div>
      <div className="page-header">
        <h1>사용자 등록</h1>
      </div>
      <UserForm action={createUser} isCreate />
    </div>
  );
}

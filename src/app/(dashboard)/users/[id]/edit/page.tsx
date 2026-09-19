import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { UserForm } from "../../UserForm";
import { updateUser } from "../../actions";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const boundUpdate = updateUser.bind(null, id);

  return (
    <div>
      <div className="page-header">
        <h1>사용자 수정 - {user.name}</h1>
      </div>
      <UserForm action={boundUpdate} defaultValues={user} isCreate={false} />
    </div>
  );
}

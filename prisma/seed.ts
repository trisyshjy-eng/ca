import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where: { loginId: "admin" },
    update: {},
    create: {
      loginId: "admin",
      name: "관리자",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const staffPassword = await bcrypt.hash("staff1234", 10);
  await prisma.user.upsert({
    where: { loginId: "staff1" },
    update: {},
    create: {
      loginId: "staff1",
      name: "담당자1",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  const viewerPassword = await bcrypt.hash("viewer1234", 10);
  await prisma.user.upsert({
    where: { loginId: "viewer1" },
    update: {},
    create: {
      loginId: "viewer1",
      name: "조회자1",
      passwordHash: viewerPassword,
      role: "VIEWER",
    },
  });

  const thaiShrimp = await prisma.rawMaterial.upsert({
    where: { id: "seed-material-thai-shrimp" },
    update: {},
    create: {
      id: "seed-material-thai-shrimp",
      name: "태국 주꾸미",
      vendor: "태국 수산",
      unitCost: 82500,
      purchaseWeight: 6000,
      yieldRate: 0.85,
    },
  });

  const vnShrimp = await prisma.rawMaterial.upsert({
    where: { id: "seed-material-vn-shrimp" },
    update: {},
    create: {
      id: "seed-material-vn-shrimp",
      name: "베트남 주꾸미",
      vendor: "베트남 수산",
      unitCost: 69000,
      purchaseWeight: 5400,
      yieldRate: 0.82,
    },
  });

  const sauce = await prisma.rawMaterial.upsert({
    where: { id: "seed-material-sauce" },
    update: {},
    create: {
      id: "seed-material-sauce",
      name: "불맛2소스",
      vendor: "자체 생산",
      unitCost: 1241525,
      purchaseWeight: 215924,
      yieldRate: 0.98,
    },
  });

  const mushroom = await prisma.rawMaterial.upsert({
    where: { id: "seed-material-mushroom" },
    update: {},
    create: {
      id: "seed-material-mushroom",
      name: "표고버섯",
      vendor: "국내산지",
      unitCost: 10000,
      purchaseWeight: 1000,
      yieldRate: 1,
    },
  });

  const product = await prisma.product.upsert({
    where: { id: "seed-product-jjukkumi" },
    update: {},
    create: {
      id: "seed-product-jjukkumi",
      name: "불맛 양념 쭈꾸미",
      targetWeight: 300,
      bom: {
        create: [
          { rawMaterialId: sauce.id, groupCode: "소스", mixRatio: 0.3, blendRatio: 1 },
          { rawMaterialId: thaiShrimp.id, groupCode: "주꾸미", mixRatio: 0.5, blendRatio: 0.8 },
          { rawMaterialId: vnShrimp.id, groupCode: "주꾸미", mixRatio: 0.5, blendRatio: 0.2 },
          { rawMaterialId: mushroom.id, groupCode: "표고", mixRatio: 0.2, blendRatio: 1 },
        ],
      },
      packagingCosts: {
        create: [{ name: "포장 파우치", unitPrice: 100, quantity: 1 }],
      },
    },
  });

  await prisma.laborRate.upsert({
    where: { id: "seed-labor-mixing" },
    update: {},
    create: { id: "seed-labor-mixing", processName: "배합/혼합", hourlyWage: 12000 },
  });

  await prisma.overheadRate.upsert({
    where: { id: "seed-overhead-manufacturing" },
    update: {},
    create: {
      id: "seed-overhead-manufacturing",
      category: "MANUFACTURING",
      base: "MATERIAL_COST",
      name: "제조간접비(배부비)",
      rate: 0.05,
    },
  });

  console.log("Seed complete.");
  console.log({ adminLoginId: admin.loginId, productId: product.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

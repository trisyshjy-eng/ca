import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { calcBomLine, calcLaborCost, calcPackagingCost, validateBom } from "@/lib/costEngine";
import { deleteBomLine, deletePackagingLine, deleteProcessLine } from "../actions";
import { BomAddForm } from "./BomAddForm";
import { PackagingAddForm } from "./PackagingAddForm";
import { ProcessAddForm } from "./ProcessAddForm";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;

  const [product, rawMaterials, laborRates] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        bom: { include: { rawMaterial: true }, orderBy: { createdAt: "asc" } },
        packagingCosts: { orderBy: { createdAt: "asc" } },
        processes: { include: { laborRate: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.rawMaterial.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.laborRate.findMany({ where: { isActive: true }, orderBy: { processName: "asc" } }),
  ]);

  if (!product) notFound();

  const bomInputs = product.bom.map((b) => ({
    groupCode: b.groupCode,
    mixRatio: b.mixRatio,
    blendRatio: b.blendRatio,
    rawMaterial: b.rawMaterial,
  }));
  const bomResults = bomInputs.map((line) => calcBomLine(product.targetWeight, line));
  const validation = validateBom(bomInputs);
  const materialCost = bomResults.reduce((sum, r) => sum + r.lineCost, 0);
  const laborCost = calcLaborCost(product.processes.map((p) => ({ workHours: p.workHours, hourlyWage: p.laborRate.hourlyWage })));
  const packagingCost = calcPackagingCost(product.packagingCosts);

  return (
    <div>
      <div className="page-header">
        <h1>{product.name}</h1>
        <Link href="/products">← 품목 목록</Link>
      </div>

      <div className="card">
        <div className="form-grid">
          <div>
            <span className="text-muted">목표 패키지(구성중량)</span>
            <div>{product.targetWeight.toLocaleString()} g</div>
          </div>
          <div>
            <span className="text-muted">예상 재료비</span>
            <div>{materialCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} 원</div>
          </div>
          <div>
            <span className="text-muted">예상 노무비</span>
            <div>{laborCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} 원</div>
          </div>
          <div>
            <span className="text-muted">예상 포장비</span>
            <div>{packagingCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} 원</div>
          </div>
        </div>
        <p className="text-muted mt-16" style={{ fontSize: "0.8rem" }}>
          * 제조간접비는 제안요청의 원가 계산 단계에서 배부율을 선택해 반영됩니다.
        </p>
      </div>

      {!validation.valid && (
        <div className="card" style={{ borderColor: "var(--warning)" }}>
          <strong style={{ color: "var(--warning)" }}>배합 구성 검증 경고</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>배합 구성 (BOM)</h2>
        <table className="mt-16">
          <thead>
            <tr>
              <th>슬롯</th>
              <th>원물</th>
              <th className="text-right">배합비</th>
              <th className="text-right">혼합비율</th>
              <th className="text-right">실사용중량(g)</th>
              <th className="text-right">제조중량단가</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {product.bom.map((b, i) => (
              <tr key={b.id}>
                <td>{b.groupCode}</td>
                <td>{b.rawMaterial.name}</td>
                <td className="text-right">{(b.mixRatio * 100).toFixed(1)}%</td>
                <td className="text-right">{(b.blendRatio * 100).toFixed(1)}%</td>
                <td className="text-right">{bomResults[i].actualWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td className="text-right">{bomResults[i].lineCost.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td>
                  <form action={deleteBomLine}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                      삭제
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {product.bom.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  등록된 배합 구성이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-16">
          <BomAddForm productId={product.id} rawMaterials={rawMaterials} />
        </div>
      </div>

      <div className="card">
        <h2>포장비</h2>
        <table className="mt-16">
          <thead>
            <tr>
              <th>포장재명</th>
              <th className="text-right">단가</th>
              <th className="text-right">수량</th>
              <th className="text-right">포장비용</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {product.packagingCosts.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="text-right">{p.unitPrice.toLocaleString()}</td>
                <td className="text-right">{p.quantity.toLocaleString()}</td>
                <td className="text-right">{(p.unitPrice * p.quantity).toLocaleString()}</td>
                <td>
                  <form action={deletePackagingLine}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                      삭제
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {product.packagingCosts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  등록된 포장비가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-16">
          <PackagingAddForm productId={product.id} />
        </div>
      </div>

      <div className="card">
        <h2>공정 (노무비)</h2>
        <table className="mt-16">
          <thead>
            <tr>
              <th>공정명</th>
              <th className="text-right">시간당 임금</th>
              <th className="text-right">작업시간</th>
              <th className="text-right">노무비</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {product.processes.map((p) => (
              <tr key={p.id}>
                <td>{p.laborRate.processName}</td>
                <td className="text-right">{p.laborRate.hourlyWage.toLocaleString()}</td>
                <td className="text-right">{p.workHours.toLocaleString()}</td>
                <td className="text-right">{(p.laborRate.hourlyWage * p.workHours).toLocaleString()}</td>
                <td>
                  <form action={deleteProcessLine}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" className="secondary" style={{ margin: 0, padding: "2px 8px" }}>
                      삭제
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {product.processes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  등록된 공정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-16">
          <ProcessAddForm productId={product.id} laborRates={laborRates} />
        </div>
      </div>
    </div>
  );
}

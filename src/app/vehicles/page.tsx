import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { Plus } from "lucide-react";

export default async function VehiclesPage() {
  await requireAdmin();
  const db = getDb();
  const list = await db
    .select()
    .from(vehicles)
    .orderBy(desc(vehicles.createdAt));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">차량 관리</h1>
        <Link
          href="/vehicles/new"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          <Plus size={16} /> 차량 등록
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">색상</th>
              <th className="px-4 py-3">번호판</th>
              <th className="px-4 py-3">모델</th>
              <th className="px-4 py-3">차종</th>
              <th className="px-4 py-3">부서</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr
                key={v.id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: v.colorHex }}
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="text-brand-600 hover:underline"
                  >
                    {v.plate}
                  </Link>
                </td>
                <td className="px-4 py-3">{v.model}</td>
                <td className="px-4 py-3">{v.vehicleType ?? "-"}</td>
                <td className="px-4 py-3">{v.department ?? "-"}</td>
                <td className="px-4 py-3">
                  {v.isActive ? (
                    <span className="text-green-700">활성</span>
                  ) : (
                    <span className="text-gray-400">비활성</span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  등록된 차량이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

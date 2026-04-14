import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles, maintenanceRecords } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { LocationUpdater } from "@/components/vehicles/LocationUpdater";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = getDb();
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!vehicle) notFound();

  const records = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.vehicleId, id));

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full"
            style={{ backgroundColor: vehicle.colorHex }}
          />
          <div>
            <h1 className="text-2xl font-bold">{vehicle.plate}</h1>
            <p className="text-gray-500">
              {vehicle.model}
              {vehicle.year ? ` (${vehicle.year})` : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/vehicles/${vehicle.id}/edit`}
          className="text-sm text-brand-600 hover:underline"
        >
          편집
        </Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold mb-4">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="차종" value={vehicle.vehicleType} />
          <Info label="부서" value={vehicle.department} />
          <Info
            label="보험 만료"
            value={vehicle.insuranceExpiry ?? null}
          />
          <Info
            label="등록일"
            value={formatDate(vehicle.createdAt)}
          />
        </dl>
        {vehicle.notes && (
          <p className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">
            {vehicle.notes}
          </p>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold mb-4">최종 위치</h2>
        <LocationUpdater
          vehicleId={vehicle.id}
          lastLat={vehicle.lastLat ? Number(vehicle.lastLat) : null}
          lastLng={vehicle.lastLng ? Number(vehicle.lastLng) : null}
          lastText={vehicle.lastLocationText}
          lastUpdatedAt={vehicle.lastLocationUpdatedAt}
        />
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold mb-4">정비 이력</h2>
        {records.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 정비 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex justify-between border-b border-gray-100 py-2"
              >
                <span>
                  {r.date} · {r.type}
                </span>
                <span className="text-gray-500">
                  {r.cost?.toLocaleString() ?? 0}원
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className="text-gray-900">{value ?? "-"}</dd>
    </div>
  );
}

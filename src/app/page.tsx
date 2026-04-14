import Link from "next/link";
import { and, eq, gte, lte, ne, asc, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { reservations, vehicles, users, maintenanceRecords } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDb();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todayList, myUpcoming, allVehicles, maintenanceSoon, activeReservations] =
    await Promise.all([
      db
        .select({
          id: reservations.id,
          startAt: reservations.startAt,
          endAt: reservations.endAt,
          purpose: reservations.purpose,
          plate: vehicles.plate,
          colorHex: vehicles.colorHex,
          userName: users.name,
        })
        .from(reservations)
        .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
        .innerJoin(users, eq(reservations.userId, users.id))
        .where(
          and(
            ne(reservations.status, "cancelled"),
            gte(reservations.startAt, startOfDay),
            lte(reservations.startAt, endOfDay),
          ),
        )
        .orderBy(asc(reservations.startAt)),
      db
        .select({
          id: reservations.id,
          startAt: reservations.startAt,
          endAt: reservations.endAt,
          purpose: reservations.purpose,
          plate: vehicles.plate,
          colorHex: vehicles.colorHex,
        })
        .from(reservations)
        .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
        .where(
          and(
            eq(reservations.userId, user.id),
            ne(reservations.status, "cancelled"),
            gte(reservations.endAt, new Date()),
          ),
        )
        .orderBy(asc(reservations.startAt))
        .limit(5),
      db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.plate)),
      db
        .select({
          id: maintenanceRecords.id,
          vehicleId: maintenanceRecords.vehicleId,
          nextDueDate: maintenanceRecords.nextDueDate,
          type: maintenanceRecords.type,
          plate: vehicles.plate,
        })
        .from(maintenanceRecords)
        .innerJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id)),
      // Vehicles currently in use: checkin done, checkout not yet done
      db
        .select({
          vehicleId: reservations.vehicleId,
          userName: users.name,
        })
        .from(reservations)
        .innerJoin(users, eq(reservations.userId, users.id))
        .where(
          and(
            eq(reservations.status, "confirmed"),
            isNotNull(reservations.checkinAt),
            isNull(reservations.checkoutAt),
          ),
        ),
    ]);

  // Build a map: vehicleId → user currently using it
  const inUseMap = new Map(activeReservations.map((r) => [r.vehicleId, r.userName]));

  const soonThreshold = new Date();
  soonThreshold.setDate(soonThreshold.getDate() + 30);
  const upcomingMaintenance = maintenanceSoon.filter(
    (m) => m.nextDueDate && new Date(m.nextDueDate) <= soonThreshold,
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">안녕하세요, {user.name}님</h1>
        <p className="text-gray-500 text-sm mt-1">
          오늘의 차량 운행 현황입니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="활성 차량" value={allVehicles.length} />
        <Stat label="오늘 예약" value={todayList.length} />
        <Stat label="내 예정 예약" value={myUpcoming.length} />
      </div>

      {/* Vehicle status */}
      {allVehicles.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">차량 현황</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {allVehicles.map((v) => {
              const usingUser = inUseMap.get(v.id);
              const statusLabel = usingUser
                ? `사용중 (${usingUser})`
                : (v.lastReturnLocation ?? "창원본사");
              const isInUse = !!usingUser;
              return (
                <Link
                  key={v.id}
                  href={`/vehicles/${v.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {v.plate}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate mb-1">{v.model}</div>
                  <div
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isInUse
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {statusLabel}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {upcomingMaintenance.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <strong className="text-amber-900">정비 알림: </strong>
          {upcomingMaintenance.length}건의 차량 정비가 30일 이내 예정되어
          있습니다.
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-3">오늘의 예약</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {todayList.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">오늘 예약이 없습니다.</p>
          ) : (
            todayList.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: r.colorHex }}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    {r.plate} · {r.userName}
                  </div>
                  <div className="text-gray-500">
                    {formatDateTime(r.startAt)} – {formatDateTime(r.endAt)}
                    {r.purpose ? ` · ${r.purpose}` : ""}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">내 예정 예약</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {myUpcoming.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">예정된 예약이 없습니다.</p>
          ) : (
            myUpcoming.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: r.colorHex }}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{r.plate}</div>
                  <div className="text-gray-500">
                    {formatDateTime(r.startAt)} – {formatDateTime(r.endAt)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

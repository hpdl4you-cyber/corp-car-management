import { eq, and, ne, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles, reservations, users } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";

export default async function ReservationsPage() {
  await requireUser();
  const db = getDb();

  const activeVehicles = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.isActive, true))
    .orderBy(asc(vehicles.plate));

  const rows = await db
    .select({
      id: reservations.id,
      vehicleId: reservations.vehicleId,
      startAt: reservations.startAt,
      endAt: reservations.endAt,
      purpose: reservations.purpose,
      colorHex: vehicles.colorHex,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(and(ne(reservations.status, "cancelled")));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">예약 캘린더</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <WeeklyCalendar
          vehicles={activeVehicles.map((v) => ({
            id: v.id,
            title: `${v.plate} ${v.model}`,
            colorHex: v.colorHex,
          }))}
          events={rows.map((r) => ({
            id: r.id,
            vehicleId: r.vehicleId,
            title: `${r.userName}${r.purpose ? ` · ${r.purpose}` : ""}`,
            start: r.startAt.toISOString(),
            end: r.endAt.toISOString(),
            colorHex: r.colorHex,
          }))}
        />
      </div>
    </div>
  );
}

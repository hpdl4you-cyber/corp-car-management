import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reservations, vehicles, users, tripLogs } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { cancelReservation } from "@/actions/reservations";
import { upsertTripLog } from "@/actions/trip-logs";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionUser = await requireUser();
  const { id } = await params;
  const db = getDb();
  const [row] = await db
    .select({
      r: reservations,
      v: vehicles,
      u: users,
    })
    .from(reservations)
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, id))
    .limit(1);
  if (!row) notFound();

  const [log] = await db
    .select()
    .from(tripLogs)
    .where(eq(tripLogs.reservationId, id))
    .limit(1);

  const canEdit =
    row.r.userId === sessionUser.id || sessionUser.role === "admin";
  const isPast = new Date(row.r.endAt).getTime() < Date.now();

  const cancelAction = cancelReservation.bind(null, id);
  const tripAction = upsertTripLog.bind(null, id);

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full"
          style={{ backgroundColor: row.v.colorHex }}
        />
        <h1 className="text-2xl font-bold">
          {row.v.plate} · {row.v.model}
        </h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3 text-sm">
        <Row label="예약자" value={row.u.name} />
        <Row label="시작" value={formatDateTime(row.r.startAt)} />
        <Row label="종료" value={formatDateTime(row.r.endAt)} />
        <Row label="목적" value={row.r.purpose ?? "-"} />
        <Row label="목적지" value={row.r.destination ?? "-"} />
        <Row label="동승자" value={row.r.passengers ?? "-"} />
        <Row
          label="상태"
          value={
            row.r.status === "cancelled"
              ? "취소됨"
              : row.r.status === "completed"
                ? "완료"
                : "예약됨"
          }
        />
      </div>

      {canEdit && row.r.status !== "cancelled" && (
        <form action={cancelAction}>
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline"
          >
            예약 취소
          </button>
        </form>
      )}

      {isPast && canEdit && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold mb-4">운행일지</h2>
          <form action={tripAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  출발 km
                </label>
                <input
                  name="startKm"
                  type="number"
                  defaultValue={log?.startKm ?? ""}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  도착 km
                </label>
                <input
                  name="endKm"
                  type="number"
                  defaultValue={log?.endKm ?? ""}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">유류비</label>
              <input
                name="fuelCost"
                type="number"
                defaultValue={log?.fuelCost ?? 0}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">메모</label>
              <textarea
                name="notes"
                defaultValue={log?.notes ?? ""}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              저장
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <div className="w-24 text-gray-500">{label}</div>
      <div className="flex-1 text-gray-900">{value}</div>
    </div>
  );
}

import Link from "next/link";
import { and, eq, gte, lte, lt, gt, ne, asc, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { reservations, vehicles, users, maintenanceRecords } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { DatePickerNav } from "@/components/dashboard/DatePickerNav";

// ── KST helpers ──────────────────────────────────────────────────────────────

function getTodayKst(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function kstDayBounds(dateStr: string): { start: Date; end: Date; startMs: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  // KST 00:00 = UTC 00:00 - 9h
  const startMs = Date.UTC(y, m - 1, d) - 9 * 3600 * 1000;
  return { start: new Date(startMs), end: new Date(startMs + 24 * 3600 * 1000), startMs };
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

function formatKstDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = days[date.getUTCDay()];
  return `${y}년 ${m}월 ${d}일 (${dow})`;
}

// ── Timeline slots ────────────────────────────────────────────────────────────

type DayRes = {
  vehicleId: string;
  startAt: Date;
  endAt: Date;
  destination: string | null;
  colorHex: string;
};

type HourSlot = {
  reserved: boolean;
  colorHex: string | null;
  label: string; // '창' | '부' | ''
};

function destLabel(destination: string | null): string {
  if (!destination) return "";
  if (destination.includes("부산")) return "부";
  if (destination.includes("창원")) return "창";
  return "";
}

function buildVehicleSlots(vehicleId: string, dayRes: DayRes[], dayStartMs: number): HourSlot[] {
  const slots: HourSlot[] = Array.from({ length: 24 }, () => ({
    reserved: false,
    colorHex: null,
    label: "",
  }));

  const vRes = dayRes.filter((r) => r.vehicleId === vehicleId);

  for (const r of vRes) {
    const rStartMs = r.startAt.getTime();
    const rEndMs = r.endAt.getTime();
    const label = destLabel(r.destination);
    let firstColored = true;

    for (let h = 0; h < 24; h++) {
      const slotStartMs = dayStartMs + h * 3600 * 1000;
      const slotEndMs = slotStartMs + 3600 * 1000;
      if (slotStartMs < rEndMs && slotEndMs > rStartMs) {
        slots[h].reserved = true;
        slots[h].colorHex = r.colorHex;
        if (firstColored) {
          slots[h].label = label;
          firstColored = false;
        }
      }
    }
  }

  return slots;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const db = getDb();

  const sp = await searchParams;
  const selectedDate = sp.date ?? getTodayKst();
  const dayBounds = kstDayBounds(selectedDate);
  const prevDate = addDays(selectedDate, -1);
  const nextDate = addDays(selectedDate, 1);
  const nowKst = new Date(Date.now() + 9 * 3600 * 1000);
  const currentKstHour = nowKst.getUTCHours();
  const isToday = selectedDate === getTodayKst();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todayList, myUpcoming, allVehicles, maintenanceSoon, activeReservations, dayResData] =
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
      db
        .select({ vehicleId: reservations.vehicleId, userName: users.name })
        .from(reservations)
        .innerJoin(users, eq(reservations.userId, users.id))
        .where(
          and(
            eq(reservations.status, "confirmed"),
            isNotNull(reservations.checkinAt),
            isNull(reservations.checkoutAt),
          ),
        ),
      // Timeline: reservations overlapping the selected KST day
      db
        .select({
          vehicleId: reservations.vehicleId,
          startAt: reservations.startAt,
          endAt: reservations.endAt,
          destination: reservations.destination,
          colorHex: vehicles.colorHex,
        })
        .from(reservations)
        .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
        .where(
          and(
            ne(reservations.status, "cancelled"),
            lt(reservations.startAt, dayBounds.end),
            gt(reservations.endAt, dayBounds.start),
          ),
        ),
    ]);

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
        <p className="text-gray-500 text-sm mt-1">오늘의 차량 운행 현황입니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="활성 차량" value={allVehicles.length} />
        <Stat label="오늘 예약" value={todayList.length} />
        <Stat label="내 예정 예약" value={myUpcoming.length} />
      </div>

      {/* Vehicle timeline */}
      {allVehicles.length > 0 && (
        <section>
          {/* Header with date navigation */}
          <div className="flex items-center gap-3 mb-3">
            <h2 className="font-semibold">차량 현황</h2>
            <div className="ml-auto">
              <DatePickerNav
                selectedDate={selectedDate}
                displayLabel={formatKstDate(selectedDate)}
                prevDate={prevDate}
                nextDate={nextDate}
                isToday={isToday}
              />
            </div>
          </div>

          {/* Timeline table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="text-xs border-collapse" style={{ minWidth: "820px" }}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b border-r border-gray-200 whitespace-nowrap w-32">
                    차량
                  </th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th
                      key={h}
                      className={`py-2 font-medium text-center border-b border-gray-200 w-8 ${
                        isToday && h === currentKstHour
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-500"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allVehicles.map((v, idx) => {
                  const slots = buildVehicleSlots(v.id, dayResData, dayBounds.startMs);
                  const usingUser = inUseMap.get(v.id);
                  return (
                    <tr
                      key={v.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                    >
                      {/* Vehicle info cell */}
                      <td className="px-3 py-1.5 border-r border-gray-200 whitespace-nowrap">
                        <Link href={`/vehicles/${v.id}`} className="flex items-center gap-1.5 hover:opacity-75">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: v.colorHex }}
                          />
                          <span className="font-medium text-gray-900 truncate max-w-[80px]">
                            {v.plate}
                          </span>
                          {usingUser && (
                            <span className="text-blue-500" title={`사용중: ${usingUser}`}>●</span>
                          )}
                        </Link>
                        <div className="text-gray-400 truncate pl-4 max-w-[100px]">{v.model}</div>
                      </td>

                      {/* Hour slots */}
                      {slots.map((slot, h) => {
                        const isCurrentHour = isToday && h === currentKstHour;
                        return (
                          <td
                            key={h}
                            className={`h-10 text-center align-middle border-l border-gray-100 relative ${
                              isCurrentHour && !slot.reserved ? "bg-blue-50/50" : ""
                            }`}
                            style={
                              slot.reserved
                                ? { backgroundColor: slot.colorHex + "cc" }
                                : undefined
                            }
                          >
                            {slot.label && (
                              <span className="font-bold text-white drop-shadow-sm text-[10px]">
                                {slot.label}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            시간대는 KST 기준 · 색칠된 칸 = 예약됨 · '창'=창원본사 '부'=부산연구소 (목적지 기준)
          </p>
        </section>
      )}

      {upcomingMaintenance.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <strong className="text-amber-900">정비 알림: </strong>
          {upcomingMaintenance.length}건의 차량 정비가 30일 이내 예정되어 있습니다.
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
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.colorHex }} />
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
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.colorHex }} />
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

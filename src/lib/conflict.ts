import { and, eq, lt, gt, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { reservations } from "@/db/schema";

export async function findConflictingReservations(params: {
  vehicleId: string;
  startAt: Date;
  endAt: Date;
  excludeReservationId?: string;
}) {
  const db = getDb();
  const conditions = [
    eq(reservations.vehicleId, params.vehicleId),
    ne(reservations.status, "cancelled"),
    lt(reservations.startAt, params.endAt),
    gt(reservations.endAt, params.startAt),
  ];
  if (params.excludeReservationId) {
    conditions.push(ne(reservations.id, params.excludeReservationId));
  }
  return db
    .select({ id: reservations.id })
    .from(reservations)
    .where(and(...conditions))
    .limit(1);
}

export function assertEndAfterStart(startAt: Date, endAt: Date) {
  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error("종료 시각은 시작 시각보다 이후여야 합니다.");
  }
}

export const _markUsed = sql;

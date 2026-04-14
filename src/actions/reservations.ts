"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { reservations } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import {
  findConflictingReservations,
  assertEndAfterStart,
} from "@/lib/conflict";

const reservationSchema = z.object({
  vehicleId: z.string().uuid("차량을 선택하세요"),
  startAt: z.string().min(1, "시작 시각을 입력하세요"),
  endAt: z.string().min(1, "종료 시각을 입력하세요"),
  purpose: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  passengers: z.string().optional().nullable(),
});

function parse(formData: FormData) {
  return reservationSchema.parse({
    vehicleId: formData.get("vehicleId"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    purpose: formData.get("purpose") || null,
    destination: formData.get("destination") || null,
    passengers: formData.get("passengers") || null,
  });
}

export async function createReservation(formData: FormData) {
  const user = await requireUser();
  const data = parse(formData);
  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);
  assertEndAfterStart(startAt, endAt);

  const conflicts = await findConflictingReservations({
    vehicleId: data.vehicleId,
    startAt,
    endAt,
  });
  if (conflicts.length > 0) {
    throw new Error("해당 시간에 이미 예약된 차량입니다.");
  }

  const db = getDb();
  const { randomUUID } = await import("crypto");
  const checkinToken = randomUUID();
  const checkoutToken = randomUUID();

  await db.insert(reservations).values({
    vehicleId: data.vehicleId,
    userId: user.id,
    startAt,
    endAt,
    purpose: data.purpose ?? null,
    destination: data.destination ?? null,
    passengers: data.passengers ?? null,
    checkinToken,
    checkoutToken,
  });
  revalidatePath("/reservations");
  revalidatePath("/");
  redirect("/reservations");
}

export async function updateReservationTime(params: {
  id: string;
  startAt: Date;
  endAt: Date;
}) {
  const user = await requireUser();
  const db = getDb();
  const [existing] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, params.id))
    .limit(1);
  if (!existing) throw new Error("예약을 찾을 수 없습니다.");
  if (existing.userId !== user.id && user.role !== "admin") {
    throw new Error("권한이 없습니다.");
  }
  assertEndAfterStart(params.startAt, params.endAt);
  const conflicts = await findConflictingReservations({
    vehicleId: existing.vehicleId,
    startAt: params.startAt,
    endAt: params.endAt,
    excludeReservationId: params.id,
  });
  if (conflicts.length > 0) {
    throw new Error("해당 시간에 이미 예약된 차량입니다.");
  }
  await db
    .update(reservations)
    .set({ startAt: params.startAt, endAt: params.endAt })
    .where(eq(reservations.id, params.id));
  revalidatePath("/reservations");
  return { ok: true };
}

export async function cancelReservation(id: string) {
  const user = await requireUser();
  const db = getDb();
  const [existing] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);
  if (!existing) throw new Error("예약을 찾을 수 없습니다.");
  if (existing.userId !== user.id && user.role !== "admin") {
    throw new Error("권한이 없습니다.");
  }
  await db
    .update(reservations)
    .set({ status: "cancelled" })
    .where(and(eq(reservations.id, id)));
  revalidatePath("/reservations");
  revalidatePath("/");
}

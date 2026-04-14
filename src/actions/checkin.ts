"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { reservations, vehicles } from "@/db/schema";

export async function performCheckin(token: string) {
  const db = getDb();

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.checkinToken, token));

  if (!reservation) throw new Error("유효하지 않은 체크인 링크입니다.");
  if (reservation.status === "cancelled")
    throw new Error("취소된 예약입니다.");
  if (reservation.checkinAt) throw new Error("이미 체크인된 예약입니다.");

  await db
    .update(reservations)
    .set({ checkinAt: new Date() })
    .where(eq(reservations.id, reservation.id));

  revalidatePath("/reservations");
  revalidatePath("/");
}

export async function performCheckout(token: string, returnLocation: string) {
  const db = getDb();

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.checkoutToken, token));

  if (!reservation) throw new Error("유효하지 않은 체크아웃 링크입니다.");
  if (reservation.status === "cancelled")
    throw new Error("취소된 예약입니다.");
  if (!reservation.checkinAt) throw new Error("체크인이 먼저 필요합니다.");
  if (reservation.checkoutAt) throw new Error("이미 체크아웃된 예약입니다.");

  const now = new Date();

  await db
    .update(reservations)
    .set({
      checkoutAt: now,
      returnLocation,
      status: "completed",
    })
    .where(eq(reservations.id, reservation.id));

  // 차량 반납 위치 업데이트
  await db
    .update(vehicles)
    .set({ lastReturnLocation: returnLocation })
    .where(eq(vehicles.id, reservation.vehicleId));

  revalidatePath("/reservations");
  revalidatePath("/");
}

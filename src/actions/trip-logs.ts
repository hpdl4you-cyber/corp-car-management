"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { reservations, tripLogs } from "@/db/schema";
import { requireUser } from "@/lib/rbac";

const tripSchema = z.object({
  startKm: z.coerce.number().int().nonnegative(),
  endKm: z.coerce.number().int().nonnegative(),
  fuelCost: z.coerce.number().int().nonnegative().optional().default(0),
  notes: z.string().optional().nullable(),
});

export async function upsertTripLog(reservationId: string, formData: FormData) {
  const user = await requireUser();
  const data = tripSchema.parse({
    startKm: formData.get("startKm"),
    endKm: formData.get("endKm"),
    fuelCost: formData.get("fuelCost") ?? 0,
    notes: formData.get("notes") || null,
  });
  if (data.endKm < data.startKm) {
    throw new Error("도착 km은 출발 km보다 같거나 커야 합니다.");
  }

  const db = getDb();
  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);
  if (!reservation) throw new Error("예약을 찾을 수 없습니다.");
  if (reservation.userId !== user.id && user.role !== "admin") {
    throw new Error("권한이 없습니다.");
  }

  const [existing] = await db
    .select()
    .from(tripLogs)
    .where(eq(tripLogs.reservationId, reservationId))
    .limit(1);

  if (existing) {
    await db
      .update(tripLogs)
      .set({
        startKm: data.startKm,
        endKm: data.endKm,
        fuelCost: data.fuelCost,
        notes: data.notes ?? null,
      })
      .where(eq(tripLogs.reservationId, reservationId));
  } else {
    await db.insert(tripLogs).values({
      reservationId,
      startKm: data.startKm,
      endKm: data.endKm,
      fuelCost: data.fuelCost,
      notes: data.notes ?? null,
    });
  }

  await db
    .update(reservations)
    .set({ status: "completed" })
    .where(eq(reservations.id, reservationId));

  revalidatePath(`/reservations/${reservationId}`);
}

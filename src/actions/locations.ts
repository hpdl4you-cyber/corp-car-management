"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { requireUser } from "@/lib/rbac";

const locationSchema = z.object({
  vehicleId: z.string().uuid(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  text: z.string().optional().nullable(),
});

export async function updateLastLocation(formData: FormData) {
  const user = await requireUser();
  const data = locationSchema.parse({
    vehicleId: formData.get("vehicleId"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    text: formData.get("text") || null,
  });
  const db = getDb();
  await db
    .update(vehicles)
    .set({
      lastLat: String(data.lat),
      lastLng: String(data.lng),
      lastLocationText: data.text ?? null,
      lastLocationUpdatedAt: new Date(),
      lastLocationUpdatedBy: user.id,
    })
    .where(eq(vehicles.id, data.vehicleId));
  revalidatePath(`/vehicles/${data.vehicleId}`);
  revalidatePath("/map");
}

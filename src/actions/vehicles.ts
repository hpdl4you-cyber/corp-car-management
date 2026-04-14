"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";

const vehicleSchema = z.object({
  plate: z.string().min(1, "번호판은 필수입니다"),
  model: z.string().min(1, "모델명은 필수입니다"),
  year: z.coerce.number().int().min(1990).max(2100).optional().nullable(),
  vehicleType: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "올바른 색상 코드여야 합니다"),
  photoUrl: z.string().url().optional().nullable().or(z.literal("")),
  insuranceExpiry: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

function parseFormData(formData: FormData) {
  return vehicleSchema.parse({
    plate: formData.get("plate"),
    model: formData.get("model"),
    year: formData.get("year") || null,
    vehicleType: formData.get("vehicleType") || null,
    department: formData.get("department") || null,
    colorHex: formData.get("colorHex"),
    photoUrl: formData.get("photoUrl") || null,
    insuranceExpiry: formData.get("insuranceExpiry") || null,
    notes: formData.get("notes") || null,
  });
}

export async function createVehicle(formData: FormData) {
  await requireAdmin();
  const data = parseFormData(formData);
  const db = getDb();
  const [created] = await db
    .insert(vehicles)
    .values({
      plate: data.plate,
      model: data.model,
      year: data.year ?? null,
      vehicleType: data.vehicleType ?? null,
      department: data.department ?? null,
      colorHex: data.colorHex,
      photoUrl: data.photoUrl || null,
      insuranceExpiry: data.insuranceExpiry || null,
      notes: data.notes ?? null,
    })
    .returning();
  revalidatePath("/vehicles");
  redirect(`/vehicles/${created.id}`);
}

export async function updateVehicle(id: string, formData: FormData) {
  await requireAdmin();
  const data = parseFormData(formData);
  const db = getDb();
  await db
    .update(vehicles)
    .set({
      plate: data.plate,
      model: data.model,
      year: data.year ?? null,
      vehicleType: data.vehicleType ?? null,
      department: data.department ?? null,
      colorHex: data.colorHex,
      photoUrl: data.photoUrl || null,
      insuranceExpiry: data.insuranceExpiry || null,
      notes: data.notes ?? null,
    })
    .where(eq(vehicles.id, id));
  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}

export async function deactivateVehicle(id: string) {
  await requireAdmin();
  const db = getDb();
  await db
    .update(vehicles)
    .set({ isActive: false })
    .where(eq(vehicles.id, id));
  revalidatePath("/vehicles");
  redirect("/vehicles");
}

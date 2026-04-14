import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { createReservation } from "@/actions/reservations";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; start?: string; end?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const db = getDb();
  const list = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.isActive, true))
    .orderBy(asc(vehicles.plate));

  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">차량 예약</h1>
      <ReservationForm
        vehicles={list}
        defaultVehicleId={sp.vehicleId}
        defaultStart={sp.start}
        defaultEnd={sp.end}
        action={createReservation}
      />
    </div>
  );
}

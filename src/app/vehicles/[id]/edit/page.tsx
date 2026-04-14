import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { updateVehicle } from "@/actions/vehicles";
import { requireAdmin } from "@/lib/rbac";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = getDb();
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!vehicle) notFound();

  const action = updateVehicle.bind(null, id);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">차량 편집</h1>
      <VehicleForm vehicle={vehicle} action={action} />
    </div>
  );
}

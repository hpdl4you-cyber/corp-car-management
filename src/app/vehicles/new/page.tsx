import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { createVehicle } from "@/actions/vehicles";
import { requireAdmin } from "@/lib/rbac";

export default async function NewVehiclePage() {
  await requireAdmin();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">차량 등록</h1>
      <VehicleForm action={createVehicle} />
    </div>
  );
}

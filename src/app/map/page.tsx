import { eq, and, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { KakaoMap } from "@/components/map/KakaoMap";

export default async function MapPage() {
  await requireUser();
  const db = getDb();
  const list = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.isActive, true),
        isNotNull(vehicles.lastLat),
        isNotNull(vehicles.lastLng),
      ),
    );

  const markers = list.map((v) => ({
    id: v.id,
    lat: Number(v.lastLat),
    lng: Number(v.lastLng),
    label: v.plate,
    colorHex: v.colorHex,
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">차량 위치</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {markers.length === 0 ? (
          <p className="text-sm text-gray-500 p-8 text-center">
            위치가 등록된 차량이 없습니다. 차량 상세 페이지에서 위치를
            업데이트하세요.
          </p>
        ) : (
          <KakaoMap markers={markers} />
        )}
      </div>
    </div>
  );
}

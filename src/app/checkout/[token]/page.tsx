import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { reservations, vehicles, users } from "@/db/schema";
import { CheckoutConfirm } from "./CheckoutConfirm";
import { formatDateTime } from "@/lib/utils";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { token } = await params;
  const db = getDb();

  const [row] = await db
    .select({
      id: reservations.id,
      startAt: reservations.startAt,
      endAt: reservations.endAt,
      purpose: reservations.purpose,
      checkinAt: reservations.checkinAt,
      checkoutAt: reservations.checkoutAt,
      status: reservations.status,
      plate: vehicles.plate,
      model: vehicles.model,
      colorHex: vehicles.colorHex,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.checkoutToken, token));

  if (!row) notFound();

  if (row.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">취소된 예약</h1>
          <p className="text-gray-500 text-sm">이 예약은 취소되었습니다.</p>
        </div>
      </div>
    );
  }

  if (row.checkoutAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            이미 체크아웃됨
          </h1>
          <p className="text-gray-500 text-sm">
            체크아웃 시각: {formatDateTime(row.checkoutAt)}
          </p>
        </div>
      </div>
    );
  }

  if (!row.checkinAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            체크인 필요
          </h1>
          <p className="text-gray-500 text-sm">
            체크아웃 전에 체크인이 필요합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: row.colorHex }}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">체크아웃</h1>
            <p className="text-sm text-gray-500">
              {row.plate} · {row.model}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">예약자</span>
            <span className="font-medium">{row.userName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">체크인</span>
            <span className="font-medium">{formatDateTime(row.checkinAt!)}</span>
          </div>
          {row.purpose && (
            <div className="flex justify-between">
              <span className="text-gray-500">목적</span>
              <span className="font-medium">{row.purpose}</span>
            </div>
          )}
        </div>

        <CheckoutConfirm token={token} />
      </div>
    </div>
  );
}
